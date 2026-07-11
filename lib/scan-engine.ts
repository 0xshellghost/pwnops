// ──────────────────────────────────────────────────────────
// PwnOps — Scan Engine
// Real tool execution with strict input validation.
// Supports: nmap, testssl.sh, and custom config auditing.
//
// SECURITY CONTROLS:
// 1. All inputs validated against strict regex patterns
// 2. Uses execFile (not exec) — no shell interpolation
// 3. Scan targets are limited to valid IPs, CIDRs, and FQDNs
// 4. Execution timeouts prevent resource exhaustion
// 5. Tool paths are whitelisted — no arbitrary command execution
// ──────────────────────────────────────────────────────────

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { resolve4 } from 'dns/promises';

export interface ExtractedVulnerability {
  cveId: string;
  version: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvssScore: number;
  affectedAsset: string;
}

export interface ParsedOutput {
  formatted: string;
  vulnerabilities: ExtractedVulnerability[];
}

const execFileAsync = promisify(execFile);

// ── Tool Registry ────────────────────────────────────────
// Only tools registered here can be executed. Each entry
// defines the binary path, argument builder, output parser,
// and execution constraints.

export interface ToolDefinition {
  /** Human-readable name shown in the UI */
  displayName: string;
  /** Description for the scan launcher */
  description: string;
  /** Resolve the binary path at runtime */
  resolveBinary: () => string | null;
  /** Build the argument array from a validated target */
  buildArgs: (target: string, outputFile: string) => string[];
  /** Parse raw tool output into a structured report string */
  parseOutput: (stdout: string, stderr: string, outputFile: string | null, target: string) => Promise<ParsedOutput>;
  /** Max execution time in milliseconds */
  timeoutMs: number;
  /** Whether this tool produces a separate output file (e.g. nmap -oX) */
  usesOutputFile: boolean;
}

// ── Input Validation ─────────────────────────────────────
// These are intentionally strict. We only allow targets that
// match well-known patterns for IPs, CIDR ranges, and FQDNs.

const VALID_IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const VALID_CIDR = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const VALID_FQDN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
const VALID_HOSTNAME = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** Blocked target ranges — prevent scanning localhost and link-local */
const BLOCKED_PREFIXES = ['127.', '0.', '169.254.', '::1', 'localhost', '0000:'];

/** Validate and sanitize a scan target. Returns null if invalid. */
export function validateTarget(raw: string): string | null {
  const target = raw.trim().toLowerCase();

  // Length check
  if (target.length === 0 || target.length > 253) return null;

  // Block dangerous targets
  for (const blocked of BLOCKED_PREFIXES) {
    if (target.startsWith(blocked)) return null;
  }
  if (target === 'localhost') return null;

  // Must match one of the allowed patterns
  if (VALID_IPV4.test(target)) {
    // Validate each octet is 0-255
    const octets = target.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) return null;
    // Block private ranges only if env says so
    if (process.env.BLOCK_PRIVATE_SCANS === 'true') {
      if (octets[0] === 10) return null;
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return null;
      if (octets[0] === 192 && octets[1] === 168) return null;
    }
    return target;
  }

  if (VALID_CIDR.test(target)) {
    const [ip, mask] = target.split('/');
    const octets = ip.split('.').map(Number);
    const maskNum = Number(mask);
    if (octets.some(o => o < 0 || o > 255)) return null;
    if (maskNum < 16 || maskNum > 32) return null; // Prevent scanning huge ranges
    return target;
  }

  if (VALID_FQDN.test(target) || VALID_HOSTNAME.test(target)) {
    return target;
  }

  return null;
}

/** Check if an IP is in a blocked or private range */
function isBlockedIp(ip: string): boolean {
  for (const blocked of BLOCKED_PREFIXES) {
    if (ip.startsWith(blocked)) return true;
  }
  if (process.env.BLOCK_PRIVATE_SCANS === 'true') {
    const octets = ip.split('.').map(Number);
    if (octets.length === 4) {
      if (octets[0] === 10) return true;
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
      if (octets[0] === 192 && octets[1] === 168) return true;
    }
  }
  return false;
}

/**
 * Async target validation with DNS rebinding protection.
 * Resolves FQDNs to their IP addresses and checks them against blocked ranges.
 */
export async function validateTargetSafe(raw: string): Promise<string | null> {
  const target = validateTarget(raw);
  if (!target) return null;

  // If it's an FQDN, resolve DNS and verify the IPs are safe
  if (VALID_FQDN.test(target) || VALID_HOSTNAME.test(target)) {
    try {
      const ips = await resolve4(target);
      for (const ip of ips) {
        if (isBlockedIp(ip)) {
          console.warn(`[PwnOps] DNS rebinding blocked: ${target} resolves to ${ip}`);
          return null;
        }
      }
    } catch {
      // DNS resolution failed — target may not exist, let the scan tool handle it
    }
  }

  return target;
}

/** Validate a tool name against the registry */
export function validateToolName(name: string): boolean {
  return name in TOOL_REGISTRY;
}

// ── Tool Definitions ─────────────────────────────────────

function findBinary(names: string[]): string | null {
  const searchPaths = [
    '/usr/bin/', '/usr/local/bin/', '/usr/sbin/',
    '/opt/homebrew/bin/', '/snap/bin/',
  ];
  for (const name of names) {
    for (const dir of searchPaths) {
      const full = dir + name;
      if (existsSync(full)) return full;
    }
  }
  return null;
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {

  // ─── Nmap — Network Discovery & Port Scanning ─────────
  'nmap': {
    displayName: 'Nmap Port Scanner',
    description: 'TCP SYN scan with service/version detection',
    resolveBinary: () => findBinary(['nmap']),
    buildArgs: (target, outputFile) => [
      '-sV',            // Service version detection
      '-T4',            // Aggressive timing (faster)
      '-Pn',            // Skip host discovery (treat as online)
      '--unprivileged', // Bypass raw socket requirement on cloud providers like Render
      '--open',         // Only show open ports
      '-oX', outputFile, // XML output for structured parsing
      '--max-retries', '2',
      '--host-timeout', '240s',
      target,
    ],
    parseOutput: async (_stdout, _stderr, outputFile, target) => {
      if (!outputFile || !existsSync(outputFile)) {
        return { formatted: '[!] Nmap did not produce output', vulnerabilities: [] };
      }
      const xml = await readFile(outputFile, 'utf-8');
      return { formatted: parseNmapXml(xml), vulnerabilities: [] };
    },
    timeoutMs: 300_000, // 5 minutes
    usesOutputFile: true,
  },

  // ─── Nmap Network Recon — Host Discovery ──────────────
  'nmap-recon': {
    displayName: 'Nmap Network Recon',
    description: 'Host discovery scan across a subnet',
    resolveBinary: () => findBinary(['nmap']),
    buildArgs: (target, outputFile) => [
      '-sn',            // Ping scan (host discovery only)
      '-T4',
      '--unprivileged', // Bypass raw socket requirement
      '-oX', outputFile,
      target,
    ],
    parseOutput: async (_stdout, _stderr, outputFile, target) => {
      if (!outputFile || !existsSync(outputFile)) {
        return { formatted: '[!] Nmap recon did not produce output', vulnerabilities: [] };
      }
      const xml = await readFile(outputFile, 'utf-8');
      return { formatted: parseNmapReconXml(xml), vulnerabilities: [] };
    },
    timeoutMs: 120_000, // 2 minutes
    usesOutputFile: true,
  },

  // ─── testssl.sh — SSL/TLS Analysis ────────────────────
  'testssl': {
    displayName: 'testssl.sh SSL Audit',
    description: 'Comprehensive SSL/TLS configuration audit',
    resolveBinary: () => findBinary(['testssl', 'testssl.sh']),
    buildArgs: (target, outputFile) => [
      '--jsonfile', outputFile,
      '--severity', 'LOW',
      '--fast',
      '--quiet',
      '--color', '0',
      target,
    ],
    parseOutput: async (stdout, _stderr, outputFile, target) => {
      if (outputFile && existsSync(outputFile)) {
        try {
          const raw = await readFile(outputFile, 'utf-8');
          return parseTestsslJson(raw, target);
        } catch {
          // Fall through to stdout
        }
      }
      return { formatted: formatTestsslStdout(stdout), vulnerabilities: [] };
    },
    timeoutMs: 600_000, // 10 minutes
    usesOutputFile: true,
  },

  // ─── Lynis — System Configuration Audit ───────────────
  'lynis': {
    displayName: 'Lynis Config Audit',
    description: 'System hardening and configuration audit',
    resolveBinary: () => findBinary(['lynis']),
    buildArgs: (_target) => [
      'audit', 'system',
      '--quick',
      '--no-colors',
      '--pentest',          // Non-privileged scan mode
      '--tests-from-group', 'authentication,networking,crypto,storage',
    ],
    parseOutput: async (stdout, _stderr, _out, target) => ({
      formatted: parseLynisOutput(stdout),
      vulnerabilities: []
    }),
    timeoutMs: 300_000,
    usesOutputFile: false,
  },

  // ─── Subfinder — Subdomain Enumeration ───────────────
  'subfinder': {
    displayName: 'Subfinder Subdomain Recon',
    description: 'Fast passive subdomain enumeration',
    resolveBinary: () => findBinary(['subfinder']),
    buildArgs: (target, outputFile) => [
      '-d', target,
      '-oJ',
      '-o', outputFile,
      '-silent' // Only output results, no banner
    ],
    parseOutput: async (_stdout, _stderr, outputFile, target) => {
      if (!outputFile || !existsSync(outputFile)) {
        return { formatted: '[!] Subfinder did not produce output', vulnerabilities: [] };
      }
      const raw = await readFile(outputFile, 'utf-8');
      return { formatted: parseSubfinderJson(raw), vulnerabilities: [] };
    },
    timeoutMs: 300_000,
    usesOutputFile: true,
  },

  // ─── Nuclei — Vulnerability Scanning ─────────────────
  'nuclei': {
    displayName: 'Nuclei Vulnerability Scan',
    description: 'Fast, template-based vulnerability scanner',
    resolveBinary: () => findBinary(['nuclei']),
    buildArgs: (target, outputFile) => [
      '-u', target,
      '-json-export', outputFile, // Write output to file
      '-silent',
      '-severity', 'critical,high,medium', // Focus on important findings
      '-rate-limit', '50',        // Max 50 requests/sec (prevent RAM spike)
      '-concurrency', '10',       // Max 10 templates in parallel
      '-timeout', '10',           // Per-request timeout in seconds
    ],
    parseOutput: async (_stdout, _stderr, outputFile, target) => {
      if (!outputFile || !existsSync(outputFile)) {
        return { formatted: '[!] Nuclei did not produce output — target may have no vulnerabilities at the selected severity levels.', vulnerabilities: [] };
      }
      const raw = await readFile(outputFile, 'utf-8');
      if (!raw.trim()) {
        return { formatted: '[✓] Nuclei scan completed — no critical, high, or medium vulnerabilities found.', vulnerabilities: [] };
      }
      return parseNucleiJson(raw, target);
    },
    timeoutMs: 900_000, // 15 minutes — nuclei needs time on low-memory instances
    usesOutputFile: true,
  },

  // ─── WhatWeb — Technology Stack Detection ────────────
  'whatweb': {
    displayName: 'WhatWeb Tech Stack',
    description: 'Next generation web scanner for identifying technologies',
    resolveBinary: () => findBinary(['whatweb']),
    buildArgs: (target) => [
      target,
      '--color=NEVER'
    ],
    parseOutput: async (stdout, _stderr, _out, target) => {
      return { formatted: `[*] WhatWeb Tech Stack Detection\n────────────────────────────────────────\n  ${stdout.trim()}`, vulnerabilities: [] };
    },
    timeoutMs: 120_000,
    usesOutputFile: false,
  },
};

// ── Tool Execution ───────────────────────────────────────

export interface ScanResult {
  success: boolean;
  output: string;
  vulnerabilities?: ExtractedVulnerability[];
  exitCode: number | null;
  executionTimeMs: number;
  toolVersion: string | null;
}

/**
 * Execute a scan tool against a validated target.
 * This function is the ONLY place where child processes are spawned.
 */
export async function executeScan(
  toolName: string,
  rawTarget: string,
): Promise<ScanResult> {
  const startTime = Date.now();

  // 1. Validate tool
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    return { success: false, output: `[!] Unknown tool: ${toolName}`, vulnerabilities: [], exitCode: null, executionTimeMs: 0, toolVersion: null };
  }

  // 2. Validate target
  const target = validateTarget(rawTarget);
  if (!target) {
    return { success: false, output: `[!] Invalid or blocked target: ${rawTarget}`, vulnerabilities: [], exitCode: null, executionTimeMs: 0, toolVersion: null };
  }

  // 3. Resolve binary
  const binary = tool.resolveBinary();
  if (!binary) {
    return {
      success: false,
      output: `[!] Tool binary not found on this system: ${tool.displayName}\n` +
              `[!] Ensure the tool is installed. For example:\n` +
              `    sudo apt install nmap     # Debian/Ubuntu\n` +
              `    brew install nmap         # macOS`,
      exitCode: null,
      executionTimeMs: Date.now() - startTime,
      toolVersion: null,
    };
  }

  // 4. Prepare output file if needed
  const outputFile = tool.usesOutputFile
    ? join(tmpdir(), `pwnops-scan-${randomUUID()}.xml`)
    : '';

  // 5. Get tool version for audit trail
  let toolVersion: string | null = null;
  try {
    const { stdout: vOut } = await execFileAsync(binary, ['--version'], { timeout: 5000 });
    toolVersion = vOut.split('\n')[0]?.trim() || null;
  } catch {
    // Version check is best-effort
  }

  // 6. Execute
  try {
    const args = tool.buildArgs(target, outputFile);

    console.log(`[PwnOps Scan Engine] Executing: ${binary} ${args.join(' ')}`);

    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: tool.timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
      env: { ...process.env, PATH: '/usr/bin:/usr/local/bin:/usr/sbin:/opt/homebrew/bin' },
    });

    const parsed = await tool.parseOutput(stdout, stderr, outputFile || null, target);

    return {
      success: true,
      output: parsed.formatted,
      vulnerabilities: parsed.vulnerabilities,
      exitCode: 0,
      executionTimeMs: Date.now() - startTime,
      toolVersion,
    };
  } catch (err: unknown) {
    const execErr = err as { code?: string; killed?: boolean; stdout?: string; stderr?: string; status?: number };

    if (execErr.killed || execErr.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
      return {
        success: false,
        output: `[!] Scan timed out after ${tool.timeoutMs / 1000}s or exceeded output buffer`,
      vulnerabilities: [],
        exitCode: null,
        executionTimeMs: Date.now() - startTime,
        toolVersion,
      };
    }

    // Some tools return non-zero exit codes for findings (e.g., testssl)
    // Try to parse their output anyway
    if (execErr.stdout) {
      try {
        const parsed = await tool.parseOutput(execErr.stdout, execErr.stderr || '', outputFile || null, target);
        return {
          success: true,
          output: parsed.formatted,
          vulnerabilities: parsed.vulnerabilities,
          exitCode: execErr.status || 1,
          executionTimeMs: Date.now() - startTime,
          toolVersion,
        };
      } catch {
        // Fall through
      }
    }

    return {
      success: false,
      output: `[!] Scan failed: ${execErr.stderr || execErr.code || 'Unknown error'}`,
      vulnerabilities: [],
      exitCode: execErr.status || null,
      executionTimeMs: Date.now() - startTime,
      toolVersion,
    };
  } finally {
    // Cleanup temp output files
    if (outputFile) {
      try { await unlink(outputFile); } catch { /* ignore */ }
    }
  }
}

// ── Output Parsers ───────────────────────────────────────

/** Parse nmap XML output into a human-readable port table */
function parseNmapXml(xml: string): string {
  const lines: string[] = [];
  
  const unescapeXml = (str: string) => str
    .replace(/&#45;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Extract scan info
  const nmapRunMatch = xml.match(/<nmaprun[^>]*args="([^"]*)"[^>]*startstr="([^"]*)"/);
  if (nmapRunMatch) {
    lines.push(`[*] Nmap scan — ${unescapeXml(nmapRunMatch[2])}`);
    lines.push(`[*] Command: ${unescapeXml(nmapRunMatch[1])}`);
    lines.push('────────────────────────────────────────');
  }

  // Extract hosts
  const hostBlocks = xml.match(/<host[\s\S]*?<\/host>/g) || [];
  let totalOpen = 0;
  let totalFiltered = 0;
  let totalClosed = 0;

  for (const hostBlock of hostBlocks) {
    const addrMatch = hostBlock.match(/<address addr="([^"]*)" addrtype="ipv4"/);
    const hostNameMatch = hostBlock.match(/<hostname name="([^"]*)"/);
    const statusMatch = hostBlock.match(/<status state="([^"]*)"/);
    const host = addrMatch?.[1] || 'unknown';
    const hostname = hostNameMatch?.[1] || '';
    const status = statusMatch?.[1] || 'unknown';

    lines.push(`\n  HOST: ${host}${hostname ? ` (${hostname})` : ''}  [${status.toUpperCase()}]`);

    // Extract ports
    const portMatches = hostBlock.match(/<port[^>]*>[\s\S]*?<\/port>/g) || [];
    if (portMatches.length > 0) {
      lines.push('  PORT        STATE      SERVICE        VERSION');
      lines.push('  ──────────  ─────────  ─────────────  ──────────────────');
    }

    for (const portBlock of portMatches) {
      const portNum = portBlock.match(/portid="(\d+)"/)?.[1] || '?';
      const protocol = portBlock.match(/protocol="([^"]*)"/)?.[1] || 'tcp';
      const state = portBlock.match(/<state state="([^"]*)"/)?.[1] || '?';
      const service = portBlock.match(/<service name="([^"]*)"/)?.[1] || '?';
      const product = portBlock.match(/product="([^"]*)"/)?.[1] || '';
      const version = portBlock.match(/version="([^"]*)"/)?.[1] || '';

      const portStr = `${portNum}/${protocol}`.padEnd(10);
      const stateStr = state.padEnd(9);
      const serviceStr = service.padEnd(13);
      const versionStr = `${product} ${version}`.trim();

      lines.push(`  ${portStr}  ${stateStr}  ${serviceStr}  ${versionStr}`);

      if (state === 'open') totalOpen++;
      else if (state === 'filtered') totalFiltered++;
      else totalClosed++;
    }
  }

  lines.push('\n────────────────────────────────────────');
  lines.push(`[+] ${hostBlocks.length} host(s) scanned`);
  lines.push(`[+] ${totalOpen} open, ${totalFiltered} filtered, ${totalClosed} closed port(s)`);

  // Extract scan timing
  const finishedMatch = xml.match(/<finished[^>]*elapsed="([^"]*)"/);
  if (finishedMatch) {
    lines.push(`[+] Scan completed in ${finishedMatch[1]}s`);
  }

  return lines.join('\n');
}

/** Parse nmap host discovery XML */
function parseNmapReconXml(xml: string): string {
  const lines: string[] = [];

  const nmapRunMatch = xml.match(/<nmaprun[^>]*startstr="([^"]*)"/);
  if (nmapRunMatch) {
    lines.push(`[+] Host Discovery — ${nmapRunMatch[1]}`);
    lines.push('────────────────────────────────────────');
  }

  const hostBlocks = xml.match(/<host[\s\S]*?<\/host>/g) || [];
  let upCount = 0;
  let downCount = 0;

  for (const hostBlock of hostBlocks) {
    const addrMatch = hostBlock.match(/<address addr="([^"]*)" addrtype="ipv4"/);
    const hostNameMatch = hostBlock.match(/<hostname name="([^"]*)"/);
    const statusMatch = hostBlock.match(/<status state="([^"]*)"/);
    const latencyMatch = hostBlock.match(/<status[^>]*reason="([^"]*)"/);
    const host = addrMatch?.[1] || 'unknown';
    const hostname = hostNameMatch?.[1] || '';
    const status = statusMatch?.[1] || 'unknown';
    const reason = latencyMatch?.[1] || '';

    const statusIcon = status === 'up' ? '●' : '○';
    const statusColor = status === 'up' ? 'UP' : 'DOWN';

    lines.push(`  ${statusIcon} ${host.padEnd(18)}${hostname ? hostname.padEnd(22) : ''.padEnd(22)} ${statusColor.padEnd(6)} [${reason}]`);

    if (status === 'up') upCount++;
    else downCount++;
  }

  lines.push('────────────────────────────────────────');
  lines.push(`[+] ${upCount} host(s) up, ${downCount} down, ${hostBlocks.length} total`);

  return lines.join('\n');
}

/** Parse testssl.sh JSON output */
function parseTestsslJson(raw: string, target: string): ParsedOutput {
  const lines: string[] = [];
  const vulnerabilities: ExtractedVulnerability[] = [];

  try {
    // testssl outputs JSON array
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return { formatted: formatRawOutput('testssl.sh', raw), vulnerabilities: [] };

    lines.push('[*] SSL/TLS Audit Report');
    lines.push('────────────────────────────────────────');

    const grouped: Record<string, Array<{ id: string; finding: string; severity: string; cve: string; cwe: string }>> = {};

    for (const entry of entries) {
      const section = entry.section || 'General';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push({
        id: entry.id || '',
        finding: entry.finding || '',
        severity: entry.severity || 'INFO',
        cve: entry.cve || '',
        cwe: entry.cwe || ''
      });
    }

    for (const [section, findings] of Object.entries(grouped)) {
      lines.push(`\n  ─── ${section} ───`);
      for (const f of findings) {
        const icon = f.severity === 'OK' ? '✓' :
                     f.severity === 'INFO' ? 'ℹ' :
                     f.severity === 'LOW' ? '⚠' :
                     f.severity === 'MEDIUM' ? '✗' :
                     f.severity === 'HIGH' ? '✗✗' :
                     f.severity === 'CRITICAL' ? '✗✗✗' : '?';
        const idDisplay = f.id ? `${f.id.padEnd(30)} ` : '';
        const tags = [f.cve, f.cwe].filter(Boolean).join(', ');
        const tagDisplay = tags ? ` [${tags}]` : '';
        lines.push(`  ${icon} [${f.severity.padEnd(8)}] ${idDisplay}${f.finding}${tagDisplay}`);

        if (['HIGH', 'CRITICAL', 'MEDIUM'].includes(f.severity)) {
          vulnerabilities.push({
            cveId: f.cve || 'N/A',
            version: 'N/A',
            title: f.id || 'SSL/TLS Configuration Issue',
            description: f.finding || '',
            severity: f.severity.toLowerCase() as any,
            cvssScore: f.severity === 'CRITICAL' ? 9.5 : (f.severity === 'HIGH' ? 7.5 : 5.0),
            affectedAsset: target
          });
        }
      }
    }

    lines.push('\n────────────────────────────────────────');
    const critCount = entries.filter((e: { severity: string }) =>
      ['HIGH', 'CRITICAL'].includes(e.severity)).length;
    const warnCount = entries.filter((e: { severity: string }) =>
      ['MEDIUM', 'LOW'].includes(e.severity)).length;
    lines.push(`[+] ${critCount} critical/high, ${warnCount} warnings, ${entries.length} total findings`);

  } catch {
    return { formatted: formatRawOutput('testssl.sh', raw), vulnerabilities: [] };
  }

  return { formatted: lines.join('\n'), vulnerabilities };
}

/** Format testssl stdout when JSON parsing fails */
function formatTestsslStdout(stdout: string): string {
  // testssl.sh produces ANSI-colored output. Strip ANSI codes.
  const cleaned = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  return `[*] SSL/TLS Audit Results\n────────────────────────────────────────\n${cleaned}`;
}

/** Parse Lynis audit output */
function parseLynisOutput(stdout: string): string {
  const lines: string[] = [];
  lines.push('[*] System Configuration Audit');
  lines.push('────────────────────────────────────────');

  // Extract warnings and suggestions
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const hardening: string[] = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (trimmed.startsWith('Warning:') || trimmed.includes('[WARNING]')) {
      warnings.push(trimmed);
    } else if (trimmed.startsWith('Suggestion:') || trimmed.includes('[SUGGESTION]')) {
      suggestions.push(trimmed);
    } else if (trimmed.includes('Hardening index')) {
      hardening.push(trimmed);
    }
  }

  if (warnings.length > 0) {
    lines.push('\n  ─── Warnings ───');
    for (const w of warnings.slice(0, 20)) {
      lines.push(`  ✗ ${w}`);
    }
  }

  if (suggestions.length > 0) {
    lines.push('\n  ─── Suggestions ───');
    for (const s of suggestions.slice(0, 20)) {
      lines.push(`  ⚠ ${s}`);
    }
  }

  if (hardening.length > 0) {
    lines.push('\n  ─── Hardening Score ───');
    for (const h of hardening) {
      lines.push(`  ● ${h}`);
    }
  }

  lines.push('\n────────────────────────────────────────');
  lines.push(`[+] ${warnings.length} warning(s), ${suggestions.length} suggestion(s)`);

  return lines.join('\n');
}

/** Fallback formatter for raw tool output */
function formatRawOutput(toolName: string, raw: string): string {
  const truncated = raw.length > 5000 ? raw.substring(0, 5000) + '\n\n[...truncated]' : raw;
  return `[*] ${toolName} — Raw Output\n────────────────────────────────────────\n${truncated}`;
}

/** Parse Subfinder JSON output */
function parseSubfinderJson(raw: string): string {
  const lines: string[] = [];
  lines.push('[*] Subfinder Recon Results');
  lines.push('────────────────────────────────────────');

  const rawLines = raw.trim().split('\n');
  let count = 0;
  for (const line of rawLines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      lines.push(`  ● ${data.host}`);
      count++;
    } catch {
       lines.push(`  ● ${line}`);
       count++;
    }
  }

  lines.push('────────────────────────────────────────');
  lines.push(`[+] Found ${count} subdomain(s)`);
  return lines.join('\n');
}

/** Parse Nuclei JSON output */
function parseNucleiJson(raw: string, target: string): ParsedOutput {
  const lines: string[] = [];
  const vulnerabilities: ExtractedVulnerability[] = [];
  lines.push('[*] Nuclei Vulnerability Scan');
  lines.push('────────────────────────────────────────');

  const rawLines = raw.trim().split('\n');
  let crit = 0, high = 0, med = 0;

  for (const line of rawLines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      const sev = (data.info?.severity || 'info').toUpperCase();
      const name = data.info?.name || 'Unknown';
      const url = data.matched_at || '';
      const cveField = data.info?.classification?.['cve-id'];
      const cves = Array.isArray(cveField) ? cveField.join(', ') : (cveField || '');
      
      let icon = 'ℹ';
      if (sev === 'CRITICAL') { icon = '✗✗✗'; crit++; }
      else if (sev === 'HIGH') { icon = '✗✗'; high++; }
      else if (sev === 'MEDIUM') { icon = '✗'; med++; }

      const cveDisplay = cves ? ` [${cves}]` : '';
      lines.push(`  ${icon} [${sev.padEnd(8)}] ${name}${cveDisplay}`);
      lines.push(`      Target: ${url}`);
    } catch {
       lines.push(`  ? ${line}`);
    }
  }

  lines.push('────────────────────────────────────────');
  lines.push(`[+] ${crit} Critical, ${high} High, ${med} Medium findings`);
  return { formatted: lines.join('\n'), vulnerabilities };
}

// ── Availability Check ───────────────────────────────────

/** Returns which tools are available on this system */
export function getAvailableTools(): Array<{
  name: string;
  displayName: string;
  description: string;
  available: boolean;
  binaryPath: string | null;
}> {
  return Object.entries(TOOL_REGISTRY).map(([name, tool]) => {
    const binary = tool.resolveBinary();
    return {
      name,
      displayName: tool.displayName,
      description: tool.description,
      available: binary !== null,
      binaryPath: binary,
    };
  });
}

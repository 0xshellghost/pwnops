import { prisma } from './store';

function extractRoutingKey(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const keyParam = url.searchParams.get('routing_key') || url.searchParams.get('key');
    if (keyParam) return keyParam;
  } catch {
    // Ignore invalid URL
  }
  const hexMatch = endpoint.match(/([a-f0-9]{32})/i);
  return hexMatch ? hexMatch[1] : 'pwnops-pagerduty-routing-key';
}

function formatPayload(type: string, event: string, payload: Record<string, unknown>, endpoint?: string) {
  const timestamp = new Date().toISOString();
  
  let details = '';
  const inc = payload.incident as { title?: string; severity?: string; status?: string } | undefined;
  const scn = payload.scan as { target?: string; toolName?: string; status?: string } | undefined;

  if (inc) {
    details = `Incident: **${inc.title}**\nSeverity: ${inc.severity}\nStatus: ${inc.status}`;
  } else if (scn) {
    details = `Scan on **${scn.target}** using ${scn.toolName}\nStatus: ${scn.status}`;
  }

  switch (type) {
    case 'SLACK':
      return {
        text: `🚨 *PwnOps Alert: ${event}*\n${details.replace(/\*\*/g, '*')}`
      };
    
    case 'DISCORD':
      return {
        content: `🚨 **PwnOps Alert: ${event}**\n${details}`
      };

    case 'PAGERDUTY': {
      const routingKey = endpoint ? extractRoutingKey(endpoint) : 'pwnops-pagerduty-routing-key';
      return {
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: `PwnOps Alert: ${event}`,
          source: 'PwnOps-SOC',
          severity: inc?.severity === 'critical' ? 'critical' : 'warning',
          custom_details: payload
        }
      };
    }

    case 'GENERIC_WEBHOOK':
    default:
      return {
        event,
        timestamp,
        payload,
      };
  }
}

export async function dispatchWebhook(organizationId: string, event: string, payload: Record<string, unknown>) {
  try {
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId,
        events: {
          has: event
        }
      }
    });

    if (integrations.length === 0) return;

    for (const integration of integrations) {
      try {
        const bodyPayload = formatPayload(integration.type, event, payload, integration.endpoint);
        
        // Normalize bare routing key to Events API v2 endpoint
        let targetEndpoint = integration.endpoint;
        if (integration.type === 'PAGERDUTY' && /^[a-f0-9]{32}$/i.test(integration.endpoint.trim())) {
          targetEndpoint = 'https://events.pagerduty.com/v2/enqueue';
        }

        await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PwnOps-Webhook/1.0',
          },
          body: JSON.stringify(bodyPayload),
        });
      } catch (err) {
        console.error(`Failed to dispatch webhook to ${integration.endpoint}:`, err);
      }
    }
  } catch (err) {
    console.error('Error querying webhooks:', err);
  }
}

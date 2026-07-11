import { prisma } from './store';

function formatPayload(type: string, event: string, payload: any) {
  const timestamp = new Date().toISOString();
  
  // Format details for chat platforms
  let details = '';
  if (payload.incident) {
    details = `Incident: **${payload.incident.title}**\nSeverity: ${payload.incident.severity}\nStatus: ${payload.incident.status}`;
  } else if (payload.scan) {
    details = `Scan on **${payload.scan.target}** using ${payload.scan.toolName}\nStatus: ${payload.scan.status}`;
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

    case 'PAGERDUTY':
      return {
        routing_key: "extracted-from-url", // Dummy, since PagerDuty usually expects the key in the URL or payload. For our implementation, PagerDuty integration URLs usually have the routing key embedded or they use standard webhooks. If the user provides a PagerDuty Events V2 URL, they usually include the routing key. Let's assume standard generic webhook for now or build the exact Events V2 format.
        event_action: "trigger",
        payload: {
          summary: `PwnOps Alert: ${event}`,
          source: "PwnOps",
          severity: payload.incident?.severity === 'critical' ? 'critical' : 'warning',
          custom_details: payload
        }
      };

    case 'GENERIC_WEBHOOK':
    default:
      return {
        event,
        timestamp,
        payload,
      };
  }
}

/**
 * Dispatches a webhook to all integrations subscribed to a specific event within an organization.
 * @param organizationId The organization ID
 * @param event The event name (e.g. INCIDENT_CREATED, SCAN_COMPLETED)
 * @param payload The payload to send
 */
export async function dispatchWebhook(organizationId: string, event: string, payload: any) {
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

    integrations.forEach(async (integration) => {
      try {
        const bodyPayload = formatPayload(integration.type, event, payload);
        
        // If PagerDuty, we might need to extract routing key if they just put the base URL.
        // But often users paste the full integration URL. Let's just send the body.
        if (integration.type === 'PAGERDUTY') {
          // Attempt to extract routing key from URL if possible, otherwise rely on the endpoint
          const urlMatch = integration.endpoint.match(/([a-f0-9]{32})/);
          if (urlMatch) {
            (bodyPayload as any).routing_key = urlMatch[1];
          }
        }

        await fetch(integration.endpoint, {
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
    });
  } catch (err) {
    console.error('Error querying webhooks:', err);
  }
}

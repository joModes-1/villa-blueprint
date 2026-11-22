import { SettingsClient } from '@/components/SettingsClient';
import { getEnv } from '@/server/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · Villa Blueprint' };

export default function SettingsPage() {
  return <SettingsClient mcpUrl={getEnv().MCP_PUBLIC_URL} />;
}

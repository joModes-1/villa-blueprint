import { Workspace } from '@/components/workspace/Workspace';

export const metadata = { title: 'Project · Villa Blueprint' };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace projectId={id} />;
}

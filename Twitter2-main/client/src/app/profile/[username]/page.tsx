import ProfilePage from '@/components/ProfilePage';

// Ce composant sert uniquement de wrapper pour extraire les paramètres d'URL
// et les passer au composant principal ProfilePage
export default async function ProfilePageWrapper({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfilePage username={username} />;
}
import { useAuthenticator } from '@aws-amplify/ui-react';

function Home() {
  const { user } = useAuthenticator((context) => [context.user]);
  console.log(JSON.stringify({ user }, null, 2));

  return (
   <div>Home</div>
  )
}

export default Home

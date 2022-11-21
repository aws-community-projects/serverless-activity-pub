import { Amplify, Auth } from 'aws-amplify';
// import { withAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
// import { Amplify, Auth } from 'aws-amplify';
// import '@aws-amplify/ui-react/styles.css';


// Amplify.configure({
//   Auth: {
//     region: "us-east-1",
//     userPoolId: import.meta.env.VITE_USER_POOL_ID,
//     userPoolWebClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID,
//   },
// });

// const currentConfig = Auth.configure();

function Private() {
  const currentConfig = Auth.configure();
  console.log(JSON.stringify(`currentConfig: ${JSON.stringify(currentConfig)}`));

  return (
   <div>Private</div>
  )
}

export default Private

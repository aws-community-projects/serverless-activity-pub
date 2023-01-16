import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { useLocation, useNavigate } from 'react-router-dom';

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, signOut } = useAuthenticator((context) => [context.user]);
  console.log(JSON.stringify({ user }, null, 2));

  if (user && location.pathname === '/auth/sign_out'){
    signOut();
    navigate("/");
  }

  if (user) {
    navigate("/");
  }

  return location.pathname === '/auth/sign_in' ? (<Authenticator></Authenticator>) : (<Authenticator initialState="signUp" signUpAttributes={[
    'email',
    'preferred_username',
  ]}></Authenticator>);
}

export default Auth

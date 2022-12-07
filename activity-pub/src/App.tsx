import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Private from "./Private";
import axios from "axios";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import Home from "./Home";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home></Home>,
  },
  {
    path: "/private",
    element: <Private></Private>,
  },
  {
    path: "/auth/sign_in",
    element: <Authenticator></Authenticator>,
  },
  {
    path: "/auth/sign_up",
    element: <Authenticator initialState="signUp" signUpAttributes={[
      'email',
      'preferred_username',
    ]}></Authenticator>,
  },
]);

function App() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [config, setConfig] = useState<any>({
    loaded: true,
    data: {
      userPoolId: "us-east-1_isQ949aGt",
      userPoolWebClientId: "38rn6ih356smbhm6sk008c73ns",
      version: "1",
    },
  });
  // const [config, setConfig] = useState<any>({loaded: false, data: {}});
  const getConfig = async () => {
    const { data } = await axios.get("/config.json");
    console.log(JSON.stringify(data));
    setConfig({ loaded: true, data });
  };

  useEffect(() => {
    console.log("useEffect");
    getConfig();
  }, []);

  useEffect(() => {
    console.log(JSON.stringify(config));
    Amplify.configure({
      Auth: {
        region: "us-east-1",
        userPoolId: config.data.userPoolId,
        userPoolWebClientId: config.data.userPoolWebClientId,
      },
    });
  }, [config]);
  return config.loaded ? (
    <div>
      <h1>
        User:
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </h1>
      <RouterProvider router={router} />
    </div>
  ) : (
    <h1>Loading...</h1>
  );
}

export default App;

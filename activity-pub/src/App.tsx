import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Private from "./Private";
import axios from "axios";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import Home from "./Home";
import { useAuthenticator } from "@aws-amplify/ui-react";
import Auth from "./Auth";
import Header from "./components/header";

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
    element: <Auth></Auth>,
  },
  {
    path: "/auth/sign_up",
    element: <Auth></Auth>,
  },
  {
    path: "/auth/sign_out",
    element: <Auth></Auth>,
  },
]);

function App() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [config, setConfig] = useState<any>({
    loaded: true,
    data: {
      userPoolId: "us-east-1_tsjlays9F",
      userPoolWebClientId: "1br85s1rbehign88jlor4mophp",
      version: "1",
    },
  });
  // const [config, setConfig] = useState<any>({loaded: false, data: {}});
  const getConfig = async () => {
    const { data } = await axios.get("/config.json");
    setConfig({ loaded: true, data });
  };

  useEffect(() => {
    getConfig();
  }, []);

  useEffect(() => {
    console.log(JSON.stringify(user, null, 2));
  }, [user]);

  useEffect(() => {
    if (config.loaded) {
      Amplify.configure({
        Auth: {
          region: "us-east-1",
          userPoolId: config.data.userPoolId,
          userPoolWebClientId: config.data.userPoolWebClientId,
        },
      });
    }
  }, [config]);
  return config.loaded ? (
    <div>
      <Header></Header>
      <RouterProvider router={router} />
    </div>
  ) : (
    <h1>Loading...</h1>
  );
}

export default App;

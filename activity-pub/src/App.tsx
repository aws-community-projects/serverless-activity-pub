import { useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Private from "./Private";
import axios from "axios";
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import Home from "./Home";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home></Home>,
  },
  {
    path: "/private",
    element: <Private></Private>,
  },
]);

function App() {
  const [config, setConfig] = useState<any>({loaded: false});
  const getConfig = async () => {
    const { data } = await axios.get('/config.json');
    console.log(JSON.stringify(data));
    Amplify.configure({
      Auth: {
        region: "us-east-1",
        userPoolId: data.userPoolId,
        userPoolWebClientId: data.userPoolWebClientId,
      },
    });
    setConfig({ loaded: true, data});
  };

  useEffect(() => {
    console.log('useEffect');
    getConfig();
  }, []);

  useEffect(() => {
    console.log(JSON.stringify(config));
  }, [config]);
  return (
    config.loaded ? <RouterProvider router={router} /> : <h1>Loading...</h1>
  )
}

export default App

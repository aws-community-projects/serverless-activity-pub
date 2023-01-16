import { useAuthenticator } from "@aws-amplify/ui-react";
import { useNavigate } from "react-router-dom";

export const authRequired = () => {
  const navigate = useNavigate();

  const { user } = useAuthenticator((context) => [context.user]);
  console.log(JSON.stringify({ user }, null, 2));

  if (!user) {
    navigate("/auth/sign_in");
  }
}
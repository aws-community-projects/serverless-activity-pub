import Message from "./components/message";
import { authRequired } from "./protected";

function Private() {
  authRequired();

  return (
    <div>
      <h1>Private</h1>
      <Message></Message>
    </div>
  );
}

export default Private;

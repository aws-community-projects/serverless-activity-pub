import Follow from "./components/follow";
import Message from "./components/message";
import { authRequired } from "./protected";

function Private() {
  authRequired();

  return (
    <div>
      <h1>Private</h1>
      <h2>Follow</h2>
      <Follow></Follow>
      <h2>Message</h2>
      <Message></Message>
    </div>
  );
}

export default Private;

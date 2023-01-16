import { useAuthenticator } from "@aws-amplify/ui-react";
import { ViewBoardsIcon } from "@heroicons/react/solid";
import { useState } from "react";
import Actions from "./actions";

const Message = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [messageBox, setMessageBox] = useState("");

  const handleChange = (e: any) => {
    setMessageBox(e.target.value);
  };
  const postMessage = async () => {
    const token = user?.getSignInUserSession()?.getAccessToken().getJwtToken();
    if (token) {
      fetch(new URL(`https://martz.codes/outbox`), {
      method: "POST",
      body: JSON.stringify({
        message: messageBox,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${token}`,
      },
    });
    }
  };
  return (
    <section className="px-4 py-4 grid grid-cols-[auto,1fr] gap-4 ">
      <div className="space-y-10 w-full">
        <div className="flex-1">
          <input
            type="text"
            value={messageBox}
            onChange={handleChange}
            placeholder="What's happening?"
            className="w-full text-[1.25rem] focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="hover:bg-sky-100 p-2 rounded-full transition-colors duration-500 ease-out cursor-pointer mobile:hidden">
            <ViewBoardsIcon className="w-5 h-5 text-sky-500" />
          </div>
          <Actions
            sendMessage={() => {
              console.log(`message: ${messageBox}`);
              postMessage();
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default Message;

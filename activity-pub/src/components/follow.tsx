import { useAuthenticator } from "@aws-amplify/ui-react";
import { ViewBoardsIcon } from "@heroicons/react/solid";
import { useState } from "react";
import Actions from "./actions";

const Follow = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [userToFollow, setUserToFollow] = useState("");

  const handleChange = (e: any) => {
    setUserToFollow(e.target.value);
  };
  const postMessage = async () => {
    if (!userToFollow) {
      return;
    }
    const token = user?.getSignInUserSession()?.getAccessToken().getJwtToken();
    if (token) {
      const res = await fetch(
        new URL(`https://serverlesscult.com/internal/follow`),
        {
          method: "POST",
          body: JSON.stringify({
            userToFollow,
          }),
          headers: {
            "Content-type": "application/json; charset=UTF-8",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(JSON.stringify(res.body));
    }
  };
  return (
    <section className="px-4 py-4 grid grid-cols-[auto,1fr] gap-4 ">
      <div className="space-y-10 w-full">
        <div className="flex-1">
          <input
            type="text"
            value={userToFollow}
            onChange={handleChange}
            placeholder="martz@serverlesscult.com"
            className="w-full text-[1.25rem] focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="hover:bg-sky-100 p-2 rounded-full transition-colors duration-500 ease-out cursor-pointer mobile:hidden">
            <ViewBoardsIcon className="w-5 h-5 text-sky-500" />
          </div>
          <Actions
            sendMessage={() => {
              console.log(`message: ${userToFollow}`);
              postMessage();
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default Follow;

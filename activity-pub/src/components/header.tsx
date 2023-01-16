import { useAuthenticator } from "@aws-amplify/ui-react";

function Header() {
  const { user } = useAuthenticator((context) => [context.user]);

  console.log(user);
  return (
    <nav
      className="
          flex flex-wrap
          items-center
          justify-between
          w-full
          py-4
          md:py-0
          px-4
          text-lg text-white
          bg-black
        "
    >
      <ul className="flex">
        <li className="mr-6">
          <a href="#">
            lesstodon
          </a>
        </li>
        {user?.username && <li className="mr-6">
          <div className="text-gray-500 hover:text-blue-800">
            Logged in as {user.username}
          </div>
        </li> }
        {user?.username && <li className="mr-6">
          <a className="text-blue-500 hover:text-blue-800" href="/auth/sign_out">
            Log out
          </a>
        </li> }
        {!user?.username && <li className="mr-6">
          <a className="text-blue-500 hover:text-blue-800" href="/auth/sign_in">
            Sign in
          </a>
        </li> }
        {!user?.username && <li className="mr-6">
          <a className="text-blue-500 hover:text-blue-800" href="/auth/sign_up">
            Sign up
          </a>
        </li> }
      </ul>
    </nav>
  );
}

export default Header;

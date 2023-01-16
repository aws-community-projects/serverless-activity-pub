const Actions = ({ sendMessage }: { sendMessage: () => void}) => {
  return (
    <>
      <div className="mobile:flex items-center hidden "></div>
      <button onClick={() => sendMessage()}className="bg-sky-500 hover:bg-sky-400 hover-transition px-5 py-2 text-white font-bold rounded-full w-full mobile:w-auto">
        Toot
      </button>
    </>
  );
};

export default Actions;

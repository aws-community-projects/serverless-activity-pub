// For a multi-user setup this would be the lambda that generates the user and creates the user's public/private keys
export const handler = async (event: any) => {
  console.log(JSON.stringify(event, null, 2));
};
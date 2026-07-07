import { NextPage } from "next";

interface Props {}

const Page: NextPage<Props> = ({}) => {
  return <div>
    <h1>Register</h1>
    <form action="/api/auth/register" method="POST">
      <input type="text" name="username" placeholder="Enter username" />
      <br />
      <input type="email" name="email" placeholder="Enter email" />
      <br />
      <input type="password" name="password" placeholder="Enter password" />
      <br />
      <button type="submit">Submit</button>
      <br />
      <p>Already have an account? <a href="/login">Login</a></p>
      
    </form>
  </div>;
};

export default Page;
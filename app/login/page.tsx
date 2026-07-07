import { NextPage } from 'next'

interface Props {}

const Page: NextPage<Props> = ({}) => {
  return <div>
    <h1>Login </h1>
    <form action="/api/auth/login" method='POST'>
        <input type="text" name='email' placeholder='Enter email'></input>
        <br/>
        <input type="password" name='password' placeholder='Enter Password'></input>
        <br/>
        <button type="submit">Submit</button>
        <br/>
        <p>Don't have an account? <a href="/register">Register</a></p>
        
    </form>
  </div>
}

export default Page
import Btn from '../components/button';
import Nav from '../components/nav';
import '../styles/home.css';

function Home() {
  return (
    <div className='homepage contentContainer'>
      <Nav />
      <h1 className='title title--main'>We are here to help you to find the best provider for cervice you need</h1>

      <div className='accountContanner'>
        <Btn text='Create an account' className='accountBtn accountBtn-create' />
        <Btn text='Login into your account' className='accountBtn accountBtn-login' type='submit' />
      </div>
    </div>
  );
}

export default Home;

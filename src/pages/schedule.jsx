import { useAuth } from '../context/authContext';

import Nav from '../components/nav';

// import '../styles/profile.css';

function Schedule() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';

  return (
    <div className='profile contentContainer'>
      <Nav />
      {isPartner ? <h1 className='title title--main'>{user?.firstName}'s schedule</h1> : <div>TO see your schedule please login as a parther</div>}
    </div>
  );
}

export default Schedule;

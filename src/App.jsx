import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/authContext';
import Home from './pages/home';
import Requests from './pages/requests';
import Help from './pages/help';
import Profile from './pages/profile';
import Schedule from './pages/schedule';
import PublicProfile from './pages/publicProfile';
import Templates from './pages/templates';
import Chat from './pages/chat';
import Scan from './pages/scan';
import Book from './pages/book';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/requests' element={<Requests />} />
          <Route path='/help' element={<Help />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/profile/:id' element={<PublicProfile />} />
          <Route path='/schedule' element={<Schedule />} />
          <Route path='/scan/:id' element={<Scan />} />
          <Route path='/book/:id' element={<Book />} />
          <Route path='/templates' element={<Templates />} />
          <Route path='/chat/:id' element={<Chat />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

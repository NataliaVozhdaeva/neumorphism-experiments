import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { Link, useParams } from 'react-router';

import { authApi } from '../api/authApi';
import { bookingsApi } from '../api/bookingsApi';
import Btn from '../components/button';
import Nav from '../components/nav';
import { useAuth } from '../context/authContext';
import { todayISO } from '../utils/schedule';
import 'react-day-picker/style.css';
import '../styles/profile.css';

function Book() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    authApi
      .getPublicProfile(id)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setSelected('');
    bookingsApi
      .getSlots(id, date)
      .then((result) => !cancelled && setSlots(result))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, date]);

  const handleBook = async () => {
    setError('');
    try {
      setBooked(await bookingsApi.createBooking({ providerId: id, date, start: selected }));
    } catch (err) {
      setError(err.message);
      setSelected('');
      bookingsApi.getSlots(id, date).then(setSlots);
    }
  };

  const fullName = profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : '';
  const canBook = user?.role === 'customer';

  return (
    <div className='profile contentContainer'>
      <Nav />
      <h1 className='title title--main'>{fullName ? `Book with ${fullName}` : 'Book appointment'}</h1>

      <div className='content'>
        <div className='profile-card booking-card'>
          {booked ? (
            <p className='scan-industry'>
              Booked: {new Date(`${booked.date}T00:00`).toLocaleDateString()} at {booked.start}–{booked.end}
            </p>
          ) : (
            <>
              <DayPicker
                mode='single'
                selected={new Date(`${date}T00:00`)}
                onSelect={(day) => day && setDate(day.toLocaleDateString('en-CA'))}
                disabled={{ before: new Date(`${todayISO()}T00:00`) }}
              />

              {slots === null && <p className='scan-industry'>Loading...</p>}
              {slots?.length === 0 && <p className='scan-industry'>No available time on this day</p>}
              {slots?.length > 0 && (
                <div className='slots'>
                  {slots.map((slot) => (
                    <Btn key={slot} text={slot} className={slot === selected ? 'btn-green' : ''} onClick={() => setSelected(slot)} />
                  ))}
                </div>
              )}

              {error && <p className='scan-industry'>{error}</p>}
              {!canBook && <p className='scan-industry'>
                  <Link to='/'>Log in</Link> as a customer to book an appointment
                </p>}
              <Btn text='Book' className='btn-green book-btn' disabled={!canBook || !selected} onClick={handleBook} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Book;

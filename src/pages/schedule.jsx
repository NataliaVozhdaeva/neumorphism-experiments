import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';

import { bookingsApi } from '../api/bookingsApi';
import Btn from '../components/button';
import Nav from '../components/nav';
import { useAuth } from '../context/authContext';
import { ACTIVE_BOOKING_STATUSES, getDaySlots } from '../utils/availability';
import { todayISO } from '../utils/schedule';
import 'react-day-picker/style.css';
import '../styles/profile.css';

function Schedule() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPartner) return;
    Promise.all([bookingsApi.getMyAvailability(), bookingsApi.getMyBookings()])
      .then(([myAvailability, myBookings]) => {
        setAvailability(myAvailability);
        setBookings(myBookings);
      })
      .catch((err) => setError(err.message));
  }, [isPartner]);

  const handleToggle = async (slot, blockedSlot) => {
    setError('');
    try {
      if (blockedSlot) await bookingsApi.unblockSlot(blockedSlot.id);
      else await bookingsApi.blockSlot({ date, start: slot });
      setAvailability(await bookingsApi.getMyAvailability());
    } catch (err) {
      setError(err.message);
    }
  };

  const daySlots = availability ? getDaySlots(availability, date) : [];
  const bookedStarts = bookings
    .filter((booking) => booking.date === date && ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .map((booking) => booking.start);

  return (
    <div className='profile contentContainer'>
      <Nav />
      {isPartner ? (
        <>
          <h1 className='title title--main'>{user.firstName}'s schedule</h1>

          <div className='content'>
            <div className='profile-card booking-card'>
              <DayPicker
                mode='single'
                selected={new Date(`${date}T00:00`)}
                onSelect={(day) => day && setDate(day.toLocaleDateString('en-CA'))}
                disabled={{ before: new Date(`${todayISO()}T00:00`) }}
              />

              {availability === null && <p className='scan-industry'>Loading...</p>}
              {availability && daySlots.length === 0 && <p className='scan-industry'>No working hours on this day</p>}
              {daySlots.length > 0 && (
                <div className='slots'>
                  {daySlots.map((slot) => {
                    const blockedSlot = (availability.blockedSlots ?? []).find((item) => item.date === date && item.start === slot);
                    const isBooked = bookedStarts.includes(slot);
                    const label = isBooked ? `${slot} · booked` : blockedSlot ? `${slot} · blocked` : slot;

                    return (
                      <Btn
                        key={slot}
                        text={label}
                        className={blockedSlot || isBooked ? '' : 'btn-green'}
                        disabled={isBooked}
                        onClick={() => handleToggle(slot, blockedSlot)}
                      />
                    );
                  })}
                </div>
              )}

              {error && <p className='scan-industry'>{error}</p>}
            </div>
          </div>
        </>
      ) : (
        <div>To see your schedule please login as a partner</div>
      )}
    </div>
  );
}

export default Schedule;

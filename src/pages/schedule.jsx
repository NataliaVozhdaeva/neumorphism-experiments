import { useEffect, useState } from 'react';

import { bookingsApi } from '../api/bookingsApi';
import Btn from '../components/button';
import Nav from '../components/nav';
import Input from '../components/input';
import SlotCalendar from '../components/slotCalendar';
import { useAuth } from '../context/authContext';
import { ACTIVE_BOOKING_STATUSES, getDaySlots } from '../utils/availability';
import { todayISO } from '../utils/schedule';
import '../styles/profile.css';
import { Weekdays } from 'react-day-picker';

function Schedule() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';
  const [date, setDate] = useState('');
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
          <p>Create a schedule that allows your customers to make appointments.</p>

          <div className='content'>
            <form>
              <div className='schedule-input-container'>
                {WEEKDAYS.map((weekday) => {
                  return (
                    <div key={weekday} className='weekday-container'>
                      <div className='weekday'>{weekday}</div>
                      <div className='schedule-input-wrapper'>
                        <Input className='schedule-input' type='number' name='workingHoursFrom' placeholder='Working hours from' min='0' />
                        <span> — </span>
                        <Input className='schedule-input' type='number' name='workingHoursTo' placeholder='Working hours to' min='0' />
                      </div>
                      <div className='checkbox-contaner'>
                        <label className='everyDayCheckbox-label'>
                          <Input className='checkbox everyDayCheckbox' type='checkbox' hidden></Input>
                          <span className='checkbox-custom'></span>
                          <span>Apply to all days</span>
                        </label>
                        <label className='everyDayCheckbox-label'>
                          <Input className='checkbox everyDayCheckbox' type='checkbox' hidden></Input>
                          <span className='checkbox-custom'></span>
                          <span>Mark as day off</span>
                        </label>
                        <label className='everyDayCheckbox-label'>
                          <Input className='checkbox everyDayCheckbox' type='checkbox' hidden></Input>
                          <span className='checkbox-custom'></span>
                          <span>Custom hours</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Btn type='submit'></Btn>
            </form>
            {/* <SlotCalendar date={date} onDateChange={setDate}>
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
            </SlotCalendar> */}
          </div>
        </>
      ) : (
        <div>To see your schedule please login as a partner</div>
      )}
    </div>
  );
}

export default Schedule;

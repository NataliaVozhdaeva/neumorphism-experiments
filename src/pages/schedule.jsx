import { useEffect, useState } from 'react';

import { bookingsApi } from '../api/bookingsApi';
import Btn from '../components/button';
import Nav from '../components/nav';
import Input from '../components/input';
import Select from '../components/select';
import SlotCalendar from '../components/slotCalendar';
import { useAuth } from '../context/authContext';
import { ACTIVE_BOOKING_STATUSES, getDaySlots, toTime, WEEK_DAYS } from '../utils/availability';
import { todayISO } from '../utils/schedule';
import '../styles/profile.css';
import '../styles/schedule.css';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Schedule() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';
  const [date, setDate] = useState('');
  const [daySchedule, setDaySchedule] = useState('');
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [hours, setHours] = useState(Object.fromEntries(WEEKDAYS.map((day) => [day, { from: '', to: '' }])));

  const weekdayOptions = WEEKDAYS.map((weekday) => ({ value: weekday, label: weekday }));

  const handleHoursChange = (field, value) => {
    setHours((prev) => ({
      ...prev,
      [daySchedule]: { ...prev[daySchedule], [field]: value },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    const from = Number(hours[daySchedule].from);
    const to = Number(hours[daySchedule].to);
    if (hours[daySchedule].from === '' || hours[daySchedule].to === '' || from >= to || to > 24) {
      setError('Enter working hours: "from" must be earlier than "to"');
      return;
    }

    try {
      const key = WEEK_DAYS[WEEKDAYS.indexOf(daySchedule)];
      const existing = availability.weekly[key] ?? [];
      const allDaySlots = [...existing, { from: toTime(from * 60), to: toTime(to * 60) }].sort((a, b) => a.from.localeCompare(b.from));
      const updated = await bookingsApi.saveWeekly({ [key]: allDaySlots });
      setAvailability(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveSlot = async (key, slot) => {
    setError('');

    try {
      const remainingSlots = availability.weekly[key].filter((item) => item.from !== slot.from);
      const updated = await bookingsApi.saveWeekly({ [key]: remainingSlots });
      setAvailability(updated);
    } catch (err) {
      setError(err.message);
    }
  };

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
            <form onSubmit={handleSave}>
              <div className='schedule-input-container'>
                <Select className='select-weekdays' options={weekdayOptions} value={daySchedule} onChange={setDaySchedule} placeholder='Set a day' />

                {daySchedule && (
                  <div className='schedule-input-wrapper'>
                    <Input
                      className='schedule-input'
                      type='text'
                      placeholder='From'
                      min='0'
                      max='24'
                      value={hours[daySchedule].from}
                      onChange={(e) => handleHoursChange('from', e.target.value)}
                    />
                    <span> — </span>
                    <Input
                      className='schedule-input'
                      type='text'
                      placeholder='To'
                      min='0'
                      max='24'
                      value={hours[daySchedule].to}
                      onChange={(e) => handleHoursChange('to', e.target.value)}
                    />

                    <label className='everyDayCheckbox-label schedule-hint'>
                      <Input className='checkbox everyDayCheckbox' type='checkbox' hidden></Input>
                      <span className='checkbox-custom'></span>
                      <span>Apply to all weekdays</span>
                      <span className='hint-text'>You can change it any time and for any day</span>
                    </label>

                    <Btn className='submitDaySchedule btn-green' type='submit'>
                      Add a slot
                    </Btn>
                  </div>
                )}

                {error && <p className='error'>{error}</p>}

                {/* {WEEKDAYS.map((weekday) => {
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
                })} */}
              </div>
            </form>

            {availability &&
              WEEKDAYS.map((weekday, index) => {
                const key = WEEK_DAYS[index];
                const slots = availability.weekly[key];

                if (slots.length !== 0) {
                  return (
                    <div key={weekday} className='weekday-container'>
                      <div className='weekday-wrapper'>
                        <span className='weekday'>{weekday}</span>
                        <div className='time_slots'>
                          {slots.map((slot) => {
                            return (
                              <div className='time_slot'>
                                <span>{slot.from}</span>&nbsp;&ndash;&nbsp;<span>{slot.to}</span>
                                <button className='btn remove-slot' type='button' onClick={() => handleRemoveSlot(key, slot)}>
                                  X
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
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

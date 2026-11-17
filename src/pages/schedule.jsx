import { useEffect, useState } from 'react';

import { bookingsApi } from '../api/bookingsApi';
import Btn from '../components/button';
import Nav from '../components/nav';
import Input from '../components/input';
import Select from '../components/select';
import SlotCalendar from '../components/slotCalendar';
import { useAuth } from '../context/authContext';
import { ACTIVE_BOOKING_STATUSES, getDaySlots, toTime, WEEK_DAYS, WORK_DAYS } from '../utils/availability';
import '../styles/profile.css';
import '../styles/schedule.css';

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Schedule() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';
  const [date, setDate] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [applyTo, setApplyTo] = useState('none');
  const [daySchedule, setDaySchedule] = useState('');
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [hours, setHours] = useState(Object.fromEntries(WEEK.map((day) => [day, { from: '', to: '' }])));

  const weekdayOptions = WEEK.map((weekday) => ({ value: weekday, label: weekday }));

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
      const key = WEEK_DAYS[WEEK.indexOf(daySchedule)];
      const daysToWorkWith = applyTo === 'wholeweek' ? WEEK_DAYS : applyTo === 'weekdays' ? WORK_DAYS : [key];
      const newSlot = { from: toTime(from * 60), to: toTime(to * 60) };

      const conflictDay = daysToWorkWith.find((day) =>
        (availability.weekly[day] ?? []).some((slot) => newSlot.from < slot.to && slot.from < newSlot.to),
      );
      if (conflictDay) {
        setError(`${WEEK[WEEK_DAYS.indexOf(conflictDay)]} already has hours that overlap with this slot`);
        return;
      }

      const weekly = Object.fromEntries(
        daysToWorkWith.map((day) => {
          const existing = availability.weekly[day] ?? [];
          const allDaySlots = [...existing, newSlot].sort((a, b) => a.from.localeCompare(b.from));
          return [day, allDaySlots];
        }),
      );

      const updated = await bookingsApi.saveWeekly(weekly);
      setAvailability(updated);
      setDaySchedule('');
      setApplyTo('none');
      setHours((prev) => ({ ...prev, [daySchedule]: { from: '', to: '' } }));
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
            <button className='btn showSchedule' type='button' onClick={() => setIsScheduleOpen((prev) => !prev)}>
              {isScheduleOpen ? 'Hide schedule' : 'Show schedule'}
            </button>
            {isScheduleOpen && (
              <div className='schedule-editor'>
                <form onSubmit={handleSave}>
                  <div className='schedule-input-container'>
                    <Select className='select-WEEK' options={weekdayOptions} value={daySchedule} onChange={setDaySchedule} placeholder='Set a day' />

                    {daySchedule && (
                      <>
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
                        </div>
                        <div className='checkbox-container'>
                          <label className='everyDayCheckbox-label schedule-hint'>
                            <Input
                              className='checkbox everyDayCheckbox'
                              type='checkbox'
                              hidden
                              checked={applyTo === 'wholeweek'}
                              onChange={(e) => (e.target.checked ? setApplyTo('wholeweek') : setApplyTo('none'))}></Input>
                            <span className='checkbox-custom'></span>
                            <span>Apply to the whole week</span>
                          </label>
                          <label className='everyWeekDayCheckbox-label schedule-hint'>
                            <Input
                              className='checkbox everyWeekDayCheckbox'
                              type='checkbox'
                              hidden
                              checked={applyTo === 'weekdays'}
                              onChange={(e) => (e.target.checked ? setApplyTo('weekdays') : setApplyTo('none'))}></Input>
                            <span className='checkbox-custom'></span>
                            <span>Apply to all weekdays</span>
                          </label>

                          <span className='hint-text'>You can change it any time and for any day</span>
                        </div>

                        <Btn className='submitDaySchedule btn-green' type='submit'>
                          Add a slot
                        </Btn>
                      </>
                    )}

                    {error && <p className='error'>{error}</p>}
                  </div>
                </form>
                {availability &&
                  WEEK.map((weekday, index) => {
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
              </div>
            )}
            <SlotCalendar date={date} onDateChange={setDate}>
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
            </SlotCalendar>
          </div>
        </>
      ) : (
        <div>To see your schedule please login as a partner</div>
      )}
    </div>
  );
}

export default Schedule;

import { DayPicker } from 'react-day-picker';
import { todayISO } from '../utils/schedule';

import 'react-day-picker/style.css';

function SlotCalendar({ date, onDateChange, children }) {
  return (
    <div className='slot-calendar'>
      <div className='profile-card booking-card calendar'>
        <DayPicker
          mode='single'
          selected={new Date(`${date}T00:00`)}
          onSelect={(day) => day && onDateChange(day.toLocaleDateString('en-CA'))}
          disabled={{ before: new Date(`${todayISO()}T00:00`) }}
        />
      </div>
      {date && (
        <div className='profile-card booking-card timeslots'>
          <h3>
            {new Date(`${date}T00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          {children}
        </div>
      )}
    </div>
  );
}

export default SlotCalendar;

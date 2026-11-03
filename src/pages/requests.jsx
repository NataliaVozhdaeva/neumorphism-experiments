import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { useAuth } from '../context/authContext';
import { requestsApi } from '../api/requestsApi';
import { chatApi } from '../api/chatApi';
import { bookingsApi } from '../api/bookingsApi';
import Nav from '../components/nav';
import Input from '../components/input';
import Textarea from '../components/textarea';
import Btn from '../components/button';
import Select from '../components/select';
import Modal from '../components/modal';
import { FALLBACK_CURRENCY, formatRange } from '../utils/currency';
import { FREQUENCY_OPTIONS, UNIT_OPTIONS, formatSchedule, todayISO } from '../utils/schedule';
import { ACTIVE_BOOKING_STATUSES } from '../utils/availability';

import '../styles/requests.css';

const budgetFitLabels = {
  overlap: 'Within budget',
  outside: 'Outside budget',
};

function formatRating(rating) {
  return rating ? `★ ${rating.average.toFixed(1)} (${rating.count})` : 'No ratings yet';
}

const matchStatusLabels = {
  pending: 'Waiting for answer',
  accepted: 'Accepted',
  declined: 'Declined',
};

function getBudgetLabel(match) {
  if (match.budgetFit === 'over') return `Over budget by ${match.budgetOverPercent}%`;
  return budgetFitLabels[match.budgetFit];
}

function RequestDetails({ item }) {
  return (
    <dl className='request-details'>
      <div className='request-row'>
        <dt>Location</dt>
        <dd>{item.location}</dd>
      </div>
      <div className='request-row'>
        <dt>Service description</dt>
        <dd>{item.serviceDescription}</dd>
      </div>
      <div className='request-row'>
        <dt>Budget</dt>
        <dd>{formatRange(item.budgetFrom, item.budgetTo, item.currency)}</dd>
      </div>
      <div className='request-row'>
        <dt>When</dt>
        <dd>{formatSchedule(item.schedule)}</dd>
      </div>
      <div className='request-row'>
        <dt>Created</dt>
        <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
      </div>
    </dl>
  );
}

const UNDO_DELAY_MS = 15000;

function PartnerResponse({ item, onRespond }) {
  const { status, dealId, workStarted } = item.myMatch;
  const [choice, setChoice] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleChoose = (value) => {
    setChoice(value);
    timerRef.current = setTimeout(() => {
      setChoice(null);
      onRespond(item.id, value);
    }, UNDO_DELAY_MS);
  };

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    setChoice(null);
  };

  return (
    <div className='request-response'>
      {workStarted ? (
        <span className='request-status request-status--accepted'>Work in progress</span>
      ) : choice ? (
        <>
          {choice === 'accepted' && <span className='request-status request-status--accepted'>You accepted</span>}
          {choice === 'declined' && <span className='request-status request-status--declined'>You declined</span>}
          <Btn text='Undo' className='request-undo' onClick={handleUndo} />
        </>
      ) : (
        <>
          {status === 'pending' && <span className='request-status'>Waiting for your answer</span>}
          {status === 'accepted' && <span className='request-status request-status--accepted'>You accepted</span>}
          {status === 'declined' && <span className='request-status request-status--declined'>You declined</span>}
          {status === 'pending' && <Btn text='Accept' className='request-accept btn-green' onClick={() => handleChoose('accepted')} />}
          {status === 'pending' && <Btn text='Decline' className='request-decline' onClick={() => handleChoose('declined')} />}
        </>
      )}
      {dealId && (
        <Link to={`/chat/${dealId}`} className='request-chat-link'>
          Open chat
        </Link>
      )}
      {status === 'accepted' && !dealId && <span className='match-reason'>The customer has not opened the deal yet</span>}
    </div>
  );
}

function MatchedPartners({ item, onGoToDeal, bookings, onBookingChange }) {
  const navigate = useNavigate();
  const [openedBooking, setOpenedBooking] = useState(null);
  const findActiveBooking = (bookings, partnerId) => bookings.find((b) => b.partnerId === partnerId && ACTIVE_BOOKING_STATUSES.includes(b.status));

  const handleCancel = async () => {
    try {
      await bookingsApi.cancelBooking(openedBooking.id);
      setOpenedBooking(null);
      onBookingChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    try {
      await bookingsApi.cancelBooking(openedBooking.id);
      navigate(`/book/${openedBooking.partnerId}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (!item.matches) return null;

  return (
    <div className='request-matches'>
      <h3 className='request-matches-title'>Matched partners</h3>
      {item.matchingError && <p className='request-empty'>Couldn't find partners automatically: {item.matchingError}</p>}
      {!item.matchingError && item.matches.length === 0 && <p className='request-empty'>No matching partners yet</p>}
      {item.matches.length > 0 && (
        <ul className='match-list'>
          {item.matches.map((match) => {
            const booking = findActiveBooking(bookings, match.partnerId);
            return (
              <li key={match.partnerId} className='match-item'>
                <span className='match-score'>{match.score}%</span>
                <div className='match-info'>
                  <Link to={`/profile/${match.partnerId}`} className='match-name'>
                    {match.partnerName || 'Partner'}
                  </Link>
                  <span className='rating'>{formatRating(match.partnerRating)}</span>
                  {match.reason && <span className='match-reason'>{match.reason}</span>}
                  <div className='match-footer'>
                    {getBudgetLabel(match) && <span className={`match-budget match-budget--${match.budgetFit}`}>{getBudgetLabel(match)}</span>}
                    <span className={`request-status request-status--${match.status}`}>
                      {match.workStarted ? 'Work in progress' : matchStatusLabels[match.status]}
                    </span>
                    {match.status === 'accepted' && (
                      <>
                        <Btn text='Go to chat' className='request-deal btn-green' onClick={() => onGoToDeal(item.id, match.partnerId)} />
                        <Btn
                          text={booking ? 'Booked' : 'Book an appointment'}
                          className={booking ? 'request-appointment btn-booked' : 'request-appointment btn-green'}
                          onClick={() => (booking ? setOpenedBooking(booking) : navigate(`/book/${match.partnerId}`))}
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal isOpen={!!openedBooking} onClose={() => setOpenedBooking(null)}>
        {openedBooking && (
          <>
            <h2 className='modal-title'>Your appointment</h2>
            <p>
              {new Date(`${openedBooking.date}T00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              , {openedBooking.start}–{openedBooking.end}
            </p>
            <div className='appointment-btns-container'>
              <Btn text='Reschedule' onClick={handleReschedule} />
              <Btn text='Cancel appointment' className='btn-red' onClick={handleCancel} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Requests() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequency, setFrequency] = useState('');
  const [unit, setUnit] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    bookingsApi
      .getMyBookings()
      .then(setBookings)
      .catch(() => {});
  }, []);

  const isCustomer = user?.role === 'customer';
  const currency = user?.currency ?? FALLBACK_CURRENCY;

  useEffect(() => {
    if (!user) return;
    const load = isCustomer ? requestsApi.getMyRequests : requestsApi.getIncomingRequests;
    load().then(setRequests);
  }, [user, isCustomer]);

  const [deleteError, setDeleteError] = useState('');
  const [actionError, setActionError] = useState('');

  const handleRespond = async (id, status) => {
    setActionError('');
    try {
      await requestsApi.respondToRequest(id, status);
      setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, myMatch: { ...item.myMatch, status } } : item)));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleGoToDeal = async (requestId, partnerId) => {
    setActionError('');
    try {
      const chat = await chatApi.getOrCreateChat({ requestId, partnerId });
      navigate(`/chat/${chat.id}`);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this request? This cannot be undone.')) return;

    setDeleteError('');
    try {
      await requestsApi.deleteRequest(id);
      setRequests((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const location = (formData.get('location') ?? '').trim();
    const serviceDescription = (formData.get('serviceDescription') ?? '').trim();
    const budgetFrom = formData.get('budgetFrom') ? Number(formData.get('budgetFrom')) : null;
    const budgetTo = formData.get('budgetTo') ? Number(formData.get('budgetTo')) : null;

    if (!location) {
      setCreateError('Specify the location where you need the service');
      return;
    }
    if (!serviceDescription) {
      setCreateError('Describe the service you need');
      return;
    }
    if (budgetFrom !== null && budgetTo !== null && budgetFrom > budgetTo) {
      setCreateError('Minimum budget cannot be greater than maximum budget');
      return;
    }

    let schedule = null;
    if (frequency === 'once') {
      const dateFrom = formData.get('dateFrom');
      const dateTo = formData.get('dateTo') || null;
      if (!dateFrom) {
        setCreateError('Choose the date when you need the service');
        return;
      }
      if (dateTo && dateTo < dateFrom) {
        setCreateError('The end date cannot be earlier than the start date');
        return;
      }
      schedule = { type: 'once', dateFrom, dateTo };
    } else if (frequency === 'recurring') {
      const interval = Number(formData.get('interval'));
      const startDateValue = formData.get('startDate');
      const endDate = formData.get('endDate') || null;
      if (!Number.isInteger(interval) || interval < 1) {
        setCreateError('Repeat interval must be a whole number, 1 or more');
        return;
      }
      if (!startDateValue) {
        setCreateError('Choose the date to start from');
        return;
      }
      if (endDate && endDate < startDateValue) {
        setCreateError('The end date cannot be earlier than the start date');
        return;
      }
      schedule = { type: 'recurring', interval, unit, startDate: startDateValue, endDate };
    }

    setIsSubmitting(true);
    try {
      const newRequest = await requestsApi.createRequest({ location, serviceDescription, budgetFrom, budgetTo, currency, schedule });
      setRequests((prev) => [newRequest, ...prev]);
      form.reset();
      setFrequency('');
      setUnit('week');
      setStartDate('');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='requests contentContainer'>
        <Nav />
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  if (!isCustomer) {
    return (
      <div className='requests contentContainer'>
        <Nav />
        <h1 className='title title--main'>Requests</h1>
        {actionError && <p className='form-error'>{actionError}</p>}
        {requests.length === 0 ? (
          <p className='request-empty'>You have no requests at the moment</p>
        ) : (
          <ul className='request-list'>
            {requests.map((item) => (
              <li key={item.id} className='request-card'>
                <p className='incoming-header'>
                  <span className='match-score'>{item.myMatch.score}%</span>
                  <span>
                    Request matching your profile from <b>{item.customerName}</b> <span className='rating'>{formatRating(item.customerRating)}</span>
                  </span>
                </p>
                <RequestDetails item={item} />
                <PartnerResponse item={item} onRespond={handleRespond} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className='requests contentContainer'>
      <Nav />
      <h1 className='title title--main'>Requests</h1>

      <form className='request-form' onSubmit={handleCreateSubmit}>
        <h2 className='request-form-title'>New request</h2>
        <Input className='location' type='text' name='location' placeholder='Location where you need the service' required />
        <Textarea className='service-description' name='serviceDescription' placeholder='Describe the service you need' required />
        <div className='request-budget'>
          <Input className='budget-input' type='number' name='budgetFrom' placeholder='Budget from' min='0' />
          <span>—</span>
          <Input className='budget-input' type='number' name='budgetTo' placeholder='Budget to' min='0' />
          <span className='budget-currency'>{currency}</span>
          <Link to='/profile' className='budget-currency-change'>
            change
          </Link>
        </div>

        <Select
          className='request-frequency'
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={(value) => {
            setFrequency(value);
            setStartDate('');
          }}
          placeholder='When do you need it? (optional)'
        />

        {frequency === 'once' && (
          <div className='request-dates'>
            <label className='request-date-label'>
              <span>From</span>
              <Input className='request-date' type='date' name='dateFrom' min={todayISO()} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label className='request-date-label'>
              <span>To (optional)</span>
              <Input className='request-date' type='date' name='dateTo' min={startDate || todayISO()} />
            </label>
          </div>
        )}

        {frequency === 'recurring' && (
          <>
            <div className='request-interval'>
              <span>Every</span>
              <Input className='request-interval-input' type='number' name='interval' min='1' step='1' defaultValue='1' required />
              <Select className='request-unit' options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
            </div>
            <div className='request-dates'>
              <label className='request-date-label'>
                <span>Starting</span>
                <Input
                  className='request-date'
                  type='date'
                  name='startDate'
                  min={todayISO()}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label className='request-date-label'>
                <span>Until (optional)</span>
                <Input className='request-date' type='date' name='endDate' min={startDate || todayISO()} />
              </label>
            </div>
          </>
        )}

        {createError && <p className='form-error'>{createError}</p>}
        <Btn
          text={isSubmitting ? 'Checking the request and finding partners…' : 'Create request'}
          className='request-submit btn-green'
          type='submit'
          disabled={isSubmitting}
        />
      </form>

      <section className='request-history'>
        <h2 className='request-form-title'>My requests</h2>
        {deleteError && <p className='form-error'>{deleteError}</p>}
        {actionError && <p className='form-error'>{actionError}</p>}
        {requests.length === 0 ? (
          <p className='request-empty'>You have no requests yet</p>
        ) : (
          <ul className='request-list'>
            {requests.map((item) => (
              <li key={item.id} className='request-card'>
                <Btn text='Delete' className='request-delete' onClick={() => handleDelete(item.id)} />
                <RequestDetails item={item} />
                <MatchedPartners
                  item={item}
                  onGoToDeal={handleGoToDeal}
                  bookings={bookings}
                  onBookingChange={() => bookingsApi.getMyBookings().then(setBookings)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Requests;

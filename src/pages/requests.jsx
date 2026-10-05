import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';

import { useAuth } from '../context/authContext';
import { requestsApi } from '../api/requestsApi';
import Nav from '../components/nav';
import Input from '../components/input';
import Textarea from '../components/textarea';
import Btn from '../components/button';
import Select from '../components/select';
import { FALLBACK_CURRENCY, formatRange } from '../utils/currency';
import { FREQUENCY_OPTIONS, UNIT_OPTIONS, formatSchedule, todayISO } from '../utils/schedule';
import '../styles/requests.css';

// Подпись о бюджете рядом с мэтчем; для 'unknown' ничего не пишем
const budgetFitLabels = {
  overlap: 'Within budget',
  outside: 'Outside budget',
};

// Карточка заявки: общие поля для кастомера и провайдера
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

// Подобранные AI провайдеры — кастомер видит всех троих и может открыть их профили
function MatchedProviders({ item }) {
  // Заявки, созданные до появления мэтчинга
  if (!item.matches) return null;

  return (
    <div className='request-matches'>
      <h3 className='request-matches-title'>Matched providers</h3>
      {item.matchingError && <p className='request-empty'>Couldn't find providers automatically: {item.matchingError}</p>}
      {!item.matchingError && item.matches.length === 0 && <p className='request-empty'>No matching providers yet</p>}
      {item.matches.length > 0 && (
        <ul className='match-list'>
          {item.matches.map((match) => (
            <li key={match.providerId} className='match-item'>
              <span className='match-score'>{match.score}%</span>
              <div className='match-info'>
                <Link to={`/profile/${match.providerId}`} className='match-name'>
                  {match.providerName || 'Provider'}
                </Link>
                {match.reason && <span className='match-reason'>{match.reason}</span>}
              </div>
              {budgetFitLabels[match.budgetFit] && <span className={`match-budget match-budget--${match.budgetFit}`}>{budgetFitLabels[match.budgetFit]}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Requests() {
  const { user, isLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [createError, setCreateError] = useState('');
  // Проверка и мэтчинг через AI занимают несколько секунд — блокируем кнопку, чтобы не отправить дважды
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Селекты у нас кастомные, в FormData не попадают — держим их значения в state
  const [frequency, setFrequency] = useState('');
  const [unit, setUnit] = useState('week');
  // Нужна, чтобы у дат "по" не давать выбрать день раньше даты "с"
  const [startDate, setStartDate] = useState('');
  const isCustomer = user?.role === 'customer';
  // Валюта берётся из профиля; поменять её можно на странице профиля
  const currency = user?.currency ?? FALLBACK_CURRENCY;

  // Кастомеру — его заявки, провайдеру — заявки, в которых он попал в топ-3
  useEffect(() => {
    if (!user) return;
    const load = isCustomer ? requestsApi.getMyRequests : requestsApi.getIncomingRequests;
    load().then(setRequests);
  }, [user, isCustomer]);

  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (id) => {
    // Удаление необратимо — переспрашиваем
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

    // сохраняем узел формы до await — после него e.currentTarget уже обнулён
    const form = e.currentTarget;
    const formData = new FormData(form);
    const location = (formData.get('location') ?? '').trim();
    const serviceDescription = (formData.get('serviceDescription') ?? '').trim();
    // Бюджет необязателен: пустое поле сохраняем как null, а не как 0
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
    // Сравниваем границы только если указаны обе
    if (budgetFrom !== null && budgetTo !== null && budgetFrom > budgetTo) {
      setCreateError('Minimum budget cannot be greater than maximum budget');
      return;
    }

    if (!frequency) {
      setCreateError('Choose whether you need the service once or regularly');
      return;
    }

    let schedule;
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
    } else {
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

  // Провайдер видит заявки, которые AI подобрал под его профиль
  if (!isCustomer) {
    return (
      <div className='requests contentContainer'>
        <Nav />
        <h1 className='title title--main'>Requests</h1>
        {requests.length === 0 ? (
          <p className='request-empty'>You have no requests at the moment</p>
        ) : (
          <ul className='request-list'>
            {requests.map((item) => (
              <li key={item.id} className='request-card'>
                <p className='incoming-header'>
                  <span className='match-score'>{item.myMatch.score}%</span>
                  <span>
                    Request matching your profile from <b>{item.customerName}</b>
                  </span>
                </p>
                {item.myMatch.reason && <p className='match-reason'>{item.myMatch.reason}</p>}
                <RequestDetails item={item} />
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
          placeholder='How often do you need it?'
        />

        {/* Один раз: окно дат, в которое нужно выполнить услугу; "по" необязательно — тогда конкретный день */}
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

        {/* Регулярно: "каждые N дней/недель/месяцев" покрывает и раз в неделю, и каждые 10 дней, и раз в месяц */}
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
                <Input className='request-date' type='date' name='startDate' min={todayISO()} onChange={(e) => setStartDate(e.target.value)} required />
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
          text={isSubmitting ? 'Checking the request and finding providers…' : 'Create request'}
          className='request-submit btn-green'
          type='submit'
          disabled={isSubmitting}
        />
      </form>

      <section className='request-history'>
        <h2 className='request-form-title'>My requests</h2>
        {deleteError && <p className='form-error'>{deleteError}</p>}
        {requests.length === 0 ? (
          <p className='request-empty'>You have no requests yet</p>
        ) : (
          <ul className='request-list'>
            {requests.map((item) => (
              <li key={item.id} className='request-card'>
                <Btn text='Delete' className='request-delete' onClick={() => handleDelete(item.id)} />
                <RequestDetails item={item} />
                <MatchedProviders item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Requests;

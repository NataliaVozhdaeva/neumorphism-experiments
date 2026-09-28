import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '../context/authContext';
import { requestsApi } from '../api/requestsApi';
import Nav from '../components/nav';
import Input from '../components/input';
import Textarea from '../components/textarea';
import Btn from '../components/button';
import '../styles/requests.css';

// Если указана только одна граница бюджета — показываем "from" или "up to"
function formatBudget(from, to) {
  if (from != null && to != null) return `${from} – ${to}`;
  if (from != null) return `from ${from}`;
  if (to != null) return `up to ${to}`;
  return 'Not set';
}

function Requests() {
  const { user, isLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [createError, setCreateError] = useState('');
  const isCustomer = user?.role === 'customer';

  // Историю заявок подгружаем только заказчикам — у провайдера своих заявок нет
  useEffect(() => {
    if (!isCustomer) return;
    requestsApi.getMyRequests().then(setRequests);
  }, [isCustomer]);

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

    try {
      const newRequest = await requestsApi.createRequest({ location, serviceDescription, budgetFrom, budgetTo });
      setRequests((prev) => [newRequest, ...prev]);
      form.reset();
    } catch (err) {
      setCreateError(err.message);
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
        <h1 className='title title--main'>Here will be the history of requests</h1>
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
        </div>
        {createError && <p className='form-error'>{createError}</p>}
        <Btn text='Create request' className='request-submit btn-green' type='submit' />
      </form>

      <section className='request-history'>
        <h2 className='request-form-title'>My requests</h2>
        {requests.length === 0 ? (
          <p className='request-empty'>You have no requests yet</p>
        ) : (
          <ul className='request-list'>
            {requests.map((item) => (
              <li key={item.id} className='request-card'>
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
                    <dd>{formatBudget(item.budgetFrom, item.budgetTo)}</dd>
                  </div>
                  <div className='request-row'>
                    <dt>Created</dt>
                    <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Requests;

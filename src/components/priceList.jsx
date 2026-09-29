import { useState } from 'react';

import { useAuth } from '../context/authContext';
import { FALLBACK_CURRENCY, formatAmount } from '../utils/currency';
import Input from './input';
import Textarea from './textarea';
import Btn from './button';

// Прайс-лист провайдера: сохранённые услуги, каждую можно отредактировать или удалить
// onAddClick — открыть форму добавления услуг; если не передан, кнопку не показываем
function PriceList({ onAddClick }) {
  const { user, updateServices } = useAuth();
  // id услуги, которая сейчас редактируется, и черновик её полей
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', description: '', price: '' });
  const [error, setError] = useState('');
  const services = user.services ?? [];
  const currency = user.currency ?? FALLBACK_CURRENCY;

  const startEditing = (service) => {
    setError('');
    setEditingId(service.id);
    // У услуг, сохранённых до появления описания, его нет — подставляем пустую строку
    setDraft({ name: service.name, description: service.description ?? '', price: String(service.price) });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError('');
  };

  const saveService = async () => {
    if (!draft.name.trim() || draft.price === '') {
      setError('Each service needs both a title and a price');
      return;
    }

    try {
      await updateServices(
        services.map((service) => (service.id === editingId ? { ...service, name: draft.name.trim(), description: draft.description.trim(), price: Number(draft.price) } : service)),
      );
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeService = async (id) => {
    try {
      await updateServices(services.filter((service) => service.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className='profile-card additional-info price-list'>
      <h2 className='services-title'>Price list</h2>
      {onAddClick && <Btn text='+ Add services' className='accountBtn accountBtn-edit btn-green' onClick={onAddClick} />}

      {services.length === 0 ? (
        <p className='price-list-empty'>No services yet</p>
      ) : (
        <dl className='profile-details'>
          {services.map((service) =>
            service.id === editingId ? (
              <div key={service.id} className='profile-row price-list-row price-list-row--editing'>
                <Input
                  className='service-name'
                  type='text'
                  placeholder='Title'
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  className='service-price'
                  type='number'
                  min='0'
                  placeholder='price'
                  value={draft.price}
                  onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
                />
                <span className='service-currency'>{currency}</span>
                <Btn text='Save' className='price-list-action btn-green' onClick={saveService} />
                <Btn text='Cancel' className='price-list-action' onClick={cancelEditing} />
                <Textarea
                  className='service-description'
                  rows={2}
                  placeholder='Description (optional)'
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            ) : (
              <div key={service.id} className='profile-row price-list-row'>
                <dt>
                  <span className='price-list-title'>{service.name}</span>
                  {service.description && <span className='price-list-description'>{service.description}</span>}
                </dt>
                <dd>{formatAmount(service.price, currency)}</dd>
                <Btn text='Edit' className='price-list-action' onClick={() => startEditing(service)} />
                <Btn text='×' className='service-remove' aria-label='Remove service' onClick={() => removeService(service.id)} />
              </div>
            ),
          )}
        </dl>
      )}

      {error && <p className='form-error'>{error}</p>}
    </div>
  );
}

export default PriceList;

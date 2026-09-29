import { useState } from 'react';

import { useAuth } from '../context/authContext';
import { FALLBACK_CURRENCY } from '../utils/currency';
import Input from './input';
import Textarea from './textarea';
import Btn from './button';

// Пустой шаблон услуги: id нужен как key для списка и чтобы редактировать конкретную строку.
// name — заголовок услуги (ключ оставлен прежним, чтобы старые данные не потерялись)
function createEmptyService() {
  return { id: crypto.randomUUID(), name: '', description: '', price: '' };
}

// Форма добавления услуг: новые строки "заголовок + описание + цена" дописываются в прайс-лист профиля
// onClose — закрыть форму (по Cancel и после успешного сохранения)
function ServicesForm({ onClose }) {
  const { user, updateServices } = useAuth();
  const [rows, setRows] = useState(() => [createEmptyService()]);
  const [error, setError] = useState('');
  const currency = user.currency ?? FALLBACK_CURRENCY;

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyService()]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Полностью пустые строки просто отбрасываем; описание необязательно, а заголовок и цена — да
    const filledRows = rows.filter((row) => row.name.trim() || row.description.trim() || row.price !== '');
    if (filledRows.some((row) => !row.name.trim() || row.price === '')) {
      setError('Each service needs both a title and a price');
      return;
    }
    if (filledRows.length === 0) {
      setError('Add at least one service');
      return;
    }
    const newServices = filledRows.map((row) => ({
      id: row.id,
      name: row.name.trim(),
      description: row.description.trim(),
      price: Number(row.price),
    }));

    try {
      await updateServices([...(user.services ?? []), ...newServices]);
      // Закрываем форму — сохранённые услуги теперь видны в прайс-листе
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className='profile-card services-card' onSubmit={handleSubmit}>
      <h2 className='services-title'>Add services</h2>
      <ul className='services-list'>
        {rows.map((row) => (
          <li key={row.id} className='service-row'>
            <Input
              className='service-name'
              type='text'
              placeholder='Title (e.g. Fix a leaking tap)'
              value={row.name}
              onChange={(e) => updateRow(row.id, 'name', e.target.value)}
            />
            <Input
              className='service-price'
              type='number'
              min='0'
              placeholder='price'
              value={row.price}
              onChange={(e) => updateRow(row.id, 'price', e.target.value)}
            />
            <span className='service-currency'>{currency}</span>
            <Btn text='×' className='service-remove' aria-label='Remove service' onClick={() => removeRow(row.id)} />
            <Textarea
              className='service-description'
              rows={2}
              placeholder='Description (optional)'
              value={row.description}
              onChange={(e) => updateRow(row.id, 'description', e.target.value)}
            />
          </li>
        ))}
      </ul>

      {error && <p className='form-error'>{error}</p>}
      <div className='services-actions'>
        <Btn text='+ Add service' className='service-add' onClick={addRow} />
        <Btn text='Save services' className='service-save btn-green' type='submit' />
        <Btn text='Cancel' className='service-cancel' onClick={onClose} />
      </div>
    </form>
  );
}

export default ServicesForm;

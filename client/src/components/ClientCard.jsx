const STATUS_LABELS = {
  active: 'Активный',
  potential: 'Потенциальный',
  inactive: 'Неактивный'
};

function ClientCard({ client, onClick, onEdit, onDelete }) {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="client-card" onClick={onClick}>
      <div className="client-card-top">
        <h3 className="client-card-name">{client.name}</h3>
        <span className={`client-card-status ${client.status}`}>
          {STATUS_LABELS[client.status] || client.status}
        </span>
      </div>

      <div className="client-card-info">
        {client.phone && (
          <div className="client-card-row">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 2h3l1 3-1.5 1.5a8 8 0 003.5 3.5L11 8.5l3 1v3c0 .6-.4 1-1 1A12 12 0 012.5 3c0-.6.4-1 1-1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            <span>{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="client-card-row">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            <span>{client.email}</span>
          </div>
        )}
        {client.preferredContact && (
          <div className="client-card-row">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
            <span>{client.preferredContact}</span>
          </div>
        )}
      </div>

      <div className="client-card-actions">
        <button onClick={handleEdit}>Редактировать</button>
        <button className="delete-btn" onClick={handleDelete}>Удалить</button>
      </div>
    </div>
  );
}

export default ClientCard;

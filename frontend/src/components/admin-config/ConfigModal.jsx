// Generic modal shell shared by all admin-config dialogs.
function ConfigModal({ title, onClose, children }) {
  return (
    <div className="cfg-overlay" onMouseDown={onClose}>
      <div className="cfg-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="cfg-modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default ConfigModal;

export default function AvatarPerfil({ url, nombre, className = "" }) {
  const etiqueta = nombre?.trim() || "Usuario";
  const inicial = etiqueta.charAt(0).toUpperCase();

  return (
    <span className={`nexdesk-profile-avatar ${className}`} role="img" aria-label={`Perfil de ${etiqueta}`}>
      <span className="nexdesk-profile-avatar-fallback" aria-hidden="true">{inicial}</span>
      {url && (
        <img
          src={url}
          alt=""
          aria-hidden="true"
          onError={(evento) => { evento.currentTarget.hidden = true; }}
        />
      )}
    </span>
  );
}

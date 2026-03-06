'use client';
import { useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsShaking(false);

    const usuario = e.target.usuario.value;
    const password = e.target.password.value;

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
    });

    if (res.ok) {
      window.location.href = '/dashboard';
    } else {
      setError('Autenticación fallida: Usuario o Contraseña Inválido');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
  }

  return (
    <>
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');
        :root {
    --accent: #6c5ce7;}      


    .text-gradient {
  background: linear-gradient(to right, #ffffff 30%, var(--accent) 75%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

/* Opcional: Si quieres que el desvanecido sea de purpura a transparente */
.text-fade-out {
  background: linear-gradient(to right, var(--accent) 0%, rgba(108, 92, 231, 0) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

  /* Cuerpo con el degradado de la imagen */
  .login-body {
    height: 100vh;
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    margin: 0;
    color: #fff;
    overflow: hidden;
  }

  .navbar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          padding: 2rem 5%;
          display: flex;
          justify-content: flex-start; /* Alineado a la izquierda como en el Dashboard */
          box-sizing: border-box;
        }

        .logo {
          font-weight: 800;
          font-size: 1.5rem;
          letter-spacing: -1px;
          text-transform: uppercase;
        }

  /* Tarjeta con efecto Glassmorphism */
  .login-card {
    background: rgba(20, 20, 35, 0.6);
    backdrop-filter: blur(15px);
    padding: 50px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    width: 380px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    position: relative;
    transition: all 0.3s ease;
  }

  /* Animación de error suave */
  .shake {
    animation: shakeAnim 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes shakeAnim {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }

  /* Título limpio y elegante */
  .login-title {
    font-weight: 800;
    margin-bottom: 8px;
    font-size: 32px;
    letter-spacing: -1px;
    background: linear-gradient(to right, #ffffff, #a29bfe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .login-subtitle {
    margin-bottom: 35px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    font-weight: 400;
  }

  /* Inputs modernos */
  .login-input {
    width: 100%;
    padding: 15px;
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-family: inherit;
    font-size: 15px;
    outline: none;
    box-sizing: border-box;
    transition: 0.3s;
  }

  .login-input:focus {
    background: rgba(255, 255, 255, 0.1);
    border-color: #a29bfe;
  }

  /* Botón profesional */
  .login-button {
    width: 100%;
    padding: 16px;
    background: #6c5ce7;
    color: white;
    border: none;
    border-radius: 12px;
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
  }

  .login-button:hover {
    background: #a29bfe;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 92, 231, 0.4);
  }

  /* Estilo de error más limpio */
  .login-error {
    margin-top: 20px;
    color: #ff7675;
    font-size: 13px;
    background: rgba(255, 118, 117, 0.1);
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 118, 117, 0.2);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }


  .footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  .footer-link {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    transition: 0.3s;
  }

  .footer-link:hover {
    color: #a29bfe;
    text-shadow: 0 0 8px rgba(162, 155, 254, 0.5);
  }
`}</style>

      <div className="login-body">
        <nav className="navbar">
        <div className="logo">Service<span className="text-gradient">Desk</span></div>
      </nav>
        <div className={`login-card ${isShaking ? 'shake' : ''}`}>
          <h2 className="login-title">{error ? 'Acceso Denegado' : 'Ingreso al Sistema'}</h2>
          <p className="login-subtitle">Introduce las <span className="text-gradient">credenciales de acceso</span></p>

          <form onSubmit={handleSubmit}>
            <input
              name="usuario"
              placeholder="Usuario"
              required
              className="login-input"
              autoComplete="off"
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              required
              className="login-input"
            />
            <button type="submit" className="login-button">
              Ingresar
            </button>
          </form>
          {error && <div className="login-error">{error}</div>}
        </div>
        {}
        <footer className="footer">
          <p>
            © {new Date().getFullYear()} <span className="text-gradient">ServiceDesk</span>. 
            Todos los derechos reservados. | <a href="#" className="footer-link">Soporte Técnico</a>
          </p>
        </footer>
      </div>
    </>
  );
}
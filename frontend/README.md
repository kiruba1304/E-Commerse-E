# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Google Login Setup

1. Create an OAuth client in Google Cloud Console.
2. Add `http://localhost:5173` to the authorized JavaScript origins for local development.
3. In `frontend/.env.local`, add:

	```env
	VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
	```

4. In `backend/.env` or your shell environment, add:

	```env
	GOOGLE_CLIENT_ID=your-google-oauth-client-id
	```

5. Restart both apps after updating the environment.

The login modal uses Google Identity Services and exchanges the returned Google credential with the Flask backend at `/api/user/google-login`.

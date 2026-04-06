import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
})

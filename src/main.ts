import './styles.css';
import { createAshaApp } from './app';

const root = document.getElementById('app');
if (root) {
  createAshaApp({ root });
}

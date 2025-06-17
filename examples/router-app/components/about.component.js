/**
 * Componente de la página About
 */
import { Component } from '../../../src/decorators/component.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-about',
  template: `
    <div class="about-container">
      <h2>Acerca de Lagunlar</h2>
      
      <div class="card">
        <h3>¿Qué es Lagunlar?</h3>
        <p>Lagunlar es un framework frontend ligero inspirado en Angular, diseñado para funcionar directamente en el navegador sin necesidad de compilación.</p>
        <p>El objetivo de Lagunlar es proporcionar una experiencia de desarrollo similar a Angular pero con un enfoque más ligero y sin necesidad de herramientas de compilación.</p>
      </div>
      
      <div class="card">
        <h3>Características principales</h3>
        <ul>
          <li><strong>Sin compilación:</strong> Funciona directamente en el navegador</li>
          <li><strong>Arquitectura basada en componentes:</strong> Similar a Angular</li>
          <li><strong>DOM Virtual:</strong> Renderizado eficiente</li>
          <li><strong>Directivas estructurales modernas:</strong> @if, @for, @switch, etc.</li>
          <li><strong>Sistema de pipes:</strong> Para transformación de datos</li>
          <li><strong>Comunicación entre componentes:</strong> Con @Input() y @Output()</li>
          <li><strong>Sistema de enrutamiento:</strong> Para navegación entre vistas</li>
          <li><strong>Detección de cambios automática:</strong> Para actualizar la UI</li>
        </ul>
      </div>
      
      <div class="card">
        <h3>Versión</h3>
        <p>Versión actual: <strong>{{ version }}</strong></p>
        <p>Fecha de lanzamiento: <strong>{{ releaseDate | date:'medium' }}</strong></p>
      </div>
      
      <div class="card">
        <h3>Equipo de desarrollo</h3>
        <ul>
          <li @for="member of team">
            <strong>{{ member.name }}</strong> - {{ member.role }}
          </li>
        </ul>
      </div>
    </div>
  `
};
class AboutComponentClass {
  constructor() {
    this.version = '0.1.0';
    this.releaseDate = new Date(2025, 5, 16); // 16 de junio de 2025
    this.team = [
      { name: 'Desarrollador 1', role: 'Arquitecto de Software' },
      { name: 'Desarrollador 2', role: 'Frontend Developer' },
      { name: 'Desarrollador 3', role: 'UX/UI Designer' },
      { name: 'Desarrollador 4', role: 'QA Engineer' }
    ];
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const AboutComponent = Component(componentConfig)(AboutComponentClass);

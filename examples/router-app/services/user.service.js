/**
 * Servicio de usuarios
 */
import { Injectable } from '../../../src/decorators/injectable.js';

// Configuración del servicio
const serviceConfig = {
  providedIn: 'root'
}
export class UserService {
  constructor() {
    // Datos de ejemplo de usuarios
    this.users = [
      {
        id: '1',
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        phone: '1-770-736-8031 x56442',
        website: 'hildegard.org',
        address: {
          street: 'Kulas Light',
          suite: 'Apt. 556',
          city: 'Gwenborough',
          zipcode: '92998-3874',
          geo: {
            lat: '-37.3159',
            lng: '81.1496'
          }
        },
        company: {
          name: 'Romaguera-Crona',
          catchPhrase: 'Multi-layered client-server neural-net',
          bs: 'harness real-time e-markets'
        }
      },
      {
        id: '2',
        name: 'Ervin Howell',
        username: 'Antonette',
        email: 'Shanna@melissa.tv',
        phone: '010-692-6593 x09125',
        website: 'anastasia.net',
        address: {
          street: 'Victor Plains',
          suite: 'Suite 879',
          city: 'Wisokyburgh',
          zipcode: '90566-7771',
          geo: {
            lat: '-43.9509',
            lng: '-34.4618'
          }
        },
        company: {
          name: 'Deckow-Crist',
          catchPhrase: 'Proactive didactic contingency',
          bs: 'synergize scalable supply-chains'
        }
      },
      {
        id: '3',
        name: 'Clementine Bauch',
        username: 'Samantha',
        email: 'Nathan@yesenia.net',
        phone: '1-463-123-4447',
        website: 'ramiro.info',
        address: {
          street: 'Douglas Extension',
          suite: 'Suite 847',
          city: 'McKenziehaven',
          zipcode: '59590-4157',
          geo: {
            lat: '-68.6102',
            lng: '-47.0653'
          }
        },
        company: {
          name: 'Romaguera-Jacobson',
          catchPhrase: 'Face to face bifurcated interface',
          bs: 'e-enable strategic applications'
        }
      },
      {
        id: '4',
        name: 'Patricia Lebsack',
        username: 'Karianne',
        email: 'Julianne.OConner@kory.org',
        phone: '493-170-9623 x156',
        website: 'kale.biz',
        address: {
          street: 'Hoeger Mall',
          suite: 'Apt. 692',
          city: 'South Elvis',
          zipcode: '53919-4257',
          geo: {
            lat: '29.4572',
            lng: '-164.2990'
          }
        },
        company: {
          name: 'Robel-Corkery',
          catchPhrase: 'Multi-tiered zero tolerance productivity',
          bs: 'transition cutting-edge web services'
        }
      },
      {
        id: '5',
        name: 'Chelsey Dietrich',
        username: 'Kamren',
        email: 'Lucio_Hettinger@annie.ca',
        phone: '(254)954-1289',
        website: 'demarco.info',
        address: {
          street: 'Skiles Walks',
          suite: 'Suite 351',
          city: 'Roscoeview',
          zipcode: '33263',
          geo: {
            lat: '-31.8129',
            lng: '62.5342'
          }
        },
        company: {
          name: 'Keebler LLC',
          catchPhrase: 'User-centric fault-tolerant solution',
          bs: 'revolutionize end-to-end systems'
        }
      }
    ];
    
    // Registrar el servicio globalmente para que esté disponible en la aplicación
    if (!window.services) {
      window.services = {};
    }
    
    window.services.userService = this;
  }
  
  /**
   * Obtiene todos los usuarios
   * 
   * @returns {Array} Lista de usuarios
   */
  getUsers() {
    return [...this.users];
  }
  
  /**
   * Obtiene un usuario por su ID
   * 
   * @param {string} id - ID del usuario
   * @returns {Object|null} Usuario encontrado o null
   */
  getUserById(id) {
    return this.users.find(user => user.id === id) || null;
  }
  
  /**
   * Crea un nuevo usuario
   * 
   * @param {Object} user - Datos del usuario
   * @returns {Object} Usuario creado
   */
  createUser(user) {
    const newUser = {
      ...user,
      id: String(this.users.length + 1)
    };
    
    this.users.push(newUser);
    return newUser;
  }
  
  /**
   * Actualiza un usuario existente
   * 
   * @param {string} id - ID del usuario
   * @param {Object} userData - Datos actualizados
   * @returns {Object|null} Usuario actualizado o null
   */
  updateUser(id, userData) {
    const index = this.users.findIndex(user => user.id === id);
    
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        ...userData
      };
      
      return this.users[index];
    }
    
    return null;
  }
  
  /**
   * Elimina un usuario
   * 
   * @param {string} id - ID del usuario
   * @returns {boolean} Si el usuario fue eliminado
   */
  deleteUser(id) {
    const initialLength = this.users.length;
    this.users = this.users.filter(user => user.id !== id);
    
    return this.users.length < initialLength;
  }
}

// Aplicar la configuración del servicio
Injectable(serviceConfig)(UserService);

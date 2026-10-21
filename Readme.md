## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

Mauro Cocaro

### **0.2. Nombre del proyecto:**

Tabbie Waiter App

### **0.3. Descripción breve del proyecto:**

Tabbie Waiter App es una app Android para tablet con la que el mozo opera el salón durante todo el turno: ve las mesas ocupadas y sus pedidos, los manda a cocina, atiende los pedidos de ayuda, cobra en persona y cierra la mesa. Reemplaza al panel de mozos que hoy es una sección de la app de comensales de Tabbie, y usa el mismo backend sin modificarlo.

### **0.4. URL del proyecto:**

> Puede ser pública o privada, en cuyo caso deberás compartir los accesos de manera segura. Puedes enviarlos a [alvaro@lidr.co](mailto:alvaro@lidr.co) usando algún servicio como [onetimesecret](https://onetimesecret.com/).

Pendiente.

### 0.5. URL o archivo comprimido del repositorio

> Puedes tenerlo alojado en público o en privado, en cuyo caso deberás compartir los accesos de manera segura. Puedes enviarlos a [alvaro@lidr.co](mailto:alvaro@lidr.co) usando algún servicio como [onetimesecret](https://onetimesecret.com/). También puedes compartir por correo un archivo zip con el contenido

Pendiente.


---

## 1. Descripción general del producto

> Describe en detalle los siguientes aspectos del producto:

### **1.1. Objetivo:**

> Propósito del producto. Qué valor aporta, qué soluciona, y para quién.

Tabbie es una plataforma de pedidos y pagos para restaurantes: el comensal escanea el QR de la mesa, pide y paga desde su celular. El mozo atiende el salón con una herramienta que es una sección de esa misma app de comensales. Ese acoplamiento hace que lo que se cambia para uno afecte al otro, y ya tiene efectos en el turno: cobros que pueden quedar registrados dos veces, pedidos de ayuda que no se pueden dar por atendidos o pedidos ya cobrados que se pueden cancelar.

- **Para quién:** el mozo, único usuario de la app, que la usa durante todo el turno en una tablet que entrega el restaurante, en modo kiosco. No toma pedidos: los crea y confirma el comensal.
- **Qué aporta al mozo:** una app propia, separada de la app de comensales, que cubre el turno completo, con cobros que se registran una sola vez, avisos que se pueden atender, el salón al día aunque se corte la conexión y menos errores de operación.
- **Qué aporta al restaurante:** reemplaza el panel actual sin cambiar el resto del sistema. Usa las mismas operaciones y los mismos datos, y el backend no se modifica.

Documentos de referencia:

- [PRD del MVP](docs/prd/tabbie-waiter-mvp.md): problema, usuarios, propuesta de valor, alcance y no-alcance, requisitos funcionales y no funcionales, métricas, restricciones y supuestos.
- [Contexto del panel de mozos actual](docs/context/panel-mozos-actual.md): qué hace hoy el mozo (capacidades C1 a C14) y qué endpoints, eventos SSE, tablas y almacenamiento usa el panel, con trazabilidad hasta el código.

### **1.2. Características y funcionalidades principales:**

> Enumera y describe las características y funcionalidades específicas que tiene el producto para satisfacer las necesidades identificadas.

El MVP incluye lo necesario para que un restaurante opere un turno completo sin usar el panel web. Se organiza en siete épicas, priorizadas como Must o Should. El detalle está en el [alcance](docs/prd/tabbie-waiter-mvp.md#4-alcance-del-mvp) y los [requisitos funcionales](docs/prd/tabbie-waiter-mvp.md#6-requisitos-funcionales) del PRD.

| Épica | Prioridad | Qué hace el mozo |
|---|---|---|
| E1. Acceso del mozo | Must | Inicia sesión con email y contraseña. Solo entran mozos y la sesión se renueva sola. Cerrar sesión es Should. |
| E2. Vista del salón en tiempo real | Must | Ve las mesas ocupadas con sus pedidos, comensales, total, lo pagado y un cronómetro de demora, y recibe un aviso por cada pedido confirmado. |
| E3. Gestión de pedidos | Must | Manda a cocina los pedidos confirmados de una mesa y cancela pedidos que no tengan nada cobrado. |
| E4. Pedidos de ayuda | Should | Da por atendido un pedido de ayuda en su tablet. |
| E5. Cobros | Must | Registra cobros manuales, ve las solicitudes de cobro presencial, las confirma o elimina, y ve los cobros de cada mesa. |
| E6. Cierre de mesa | Must | Cierra la mesa, con una advertencia si queda saldo pendiente. |
| E7. Impresora virtual de comandas | Should | Consulta los pedidos confirmados que todavía no se mandaron a cocina. |

Además:

- **Requisitos no funcionales** ([sección 7 del PRD](docs/prd/tabbie-waiter-mvp.md#7-requisitos-no-funcionales)): tiempos máximos para que los cambios lleguen a la tablet, recuperación sola tras un corte de conexión, ninguna acción que cambie datos se repite sola, aislamiento por restaurante, confirmación de las acciones que cierran la sesión, la mesa o un cobro, y tablet en horizontal y en español.
- **Fuera del alcance** ([sección 5 del PRD](docs/prd/tabbie-waiter-mvp.md#5-no-alcance)): entre otros, tomar pedidos (los hace el comensal), cobrar con MercadoPago, imprimir en una impresora Bluetooth, operar sin conexión, avisos con la pantalla bloqueada y cualquier cambio en el backend.
- **Restricciones** ([sección 9 del PRD](docs/prd/tabbie-waiter-mvp.md#9-restricciones-y-supuestos)): app nativa Android para tablet, el mismo backend sin cambios y la misma autenticación que el panel actual.

### **1.3. Diseño y experiencia de usuario:**

> Proporciona imágenes y/o videotutorial mostrando la experiencia del usuario desde que aterriza en la aplicación, pasando por todas las funcionalidades principales.

Se completa con el desarrollo.

### **1.4. Instrucciones de instalación:**
> Documenta de manera precisa las instrucciones para instalar y poner en marcha el proyecto en local (librerías, backend, frontend, servidor, base de datos, migraciones y semillas de datos, etc.)

Se completa con el desarrollo.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**
> Usa el formato que consideres más adecuado para representar los componentes principales de la aplicación y las tecnologías utilizadas. Explica si sigue algún patrón predefinido, justifica por qué se ha elegido esta arquitectura, y destaca los beneficios principales que aportan al proyecto y justifican su uso, así como sacrificios o déficits que implica.


### **2.2. Descripción de componentes principales:**

> Describe los componentes más importantes, incluyendo la tecnología utilizada

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

> Representa la estructura del proyecto y explica brevemente el propósito de las carpetas principales, así como si obedece a algún patrón o arquitectura específica.

### **2.4. Infraestructura y despliegue**

> Detalla la infraestructura del proyecto, incluyendo un diagrama en el formato que creas conveniente, y explica el proceso de despliegue que se sigue

### **2.5. Seguridad**

> Enumera y describe las prácticas de seguridad principales que se han implementado en el proyecto, añadiendo ejemplos si procede

### **2.6. Tests**

> Describe brevemente algunos de los tests realizados

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

> Recomendamos usar mermaid para el modelo de datos, y utilizar todos los parámetros que permite la sintaxis para dar el máximo detalle, por ejemplo las claves primarias y foráneas.


### **3.2. Descripción de entidades principales:**

> Recuerda incluir el máximo detalle de cada entidad, como el nombre y tipo de cada atributo, descripción breve si procede, claves primarias y foráneas, relaciones y tipo de relación, restricciones (unique, not null…), etc.

---

## 4. Especificación de la API

> Si tu backend se comunica a través de API, describe los endpoints principales (máximo 3) en formato OpenAPI. Opcionalmente puedes añadir un ejemplo de petición y de respuesta para mayor claridad

---

## 5. Historias de Usuario

> Documenta 3 de las historias de usuario principales utilizadas durante el desarrollo, teniendo en cuenta las buenas prácticas de producto al respecto.

**Historia de Usuario 1**

**Historia de Usuario 2**

**Historia de Usuario 3**

---

## 6. Tickets de Trabajo

> Documenta 3 de los tickets de trabajo principales del desarrollo, uno de backend, uno de frontend, y uno de bases de datos. Da todo el detalle requerido para desarrollar la tarea de inicio a fin teniendo en cuenta las buenas prácticas al respecto. 

**Ticket 1**

**Ticket 2**

**Ticket 3**

---

## 7. Pull Requests

> Documenta 3 de las Pull Requests realizadas durante la ejecución del proyecto

**Pull Request 1**

**Pull Request 2**

**Pull Request 3**


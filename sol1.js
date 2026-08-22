
/* 
.List {
  margin: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-rows: 60px;
  grid-gap: 16px;
}

.List__item {
  line-height: 60px;
  text-align: center;
  color: white;
  text-shadow: 1px 1px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 1px 1px 0px rgba(0, 0, 0, 0.05);
}

Taken from https://clrs.cc/ 

.List__item--navy {
  background-color: #001f3f;
}

.List__item--blue {
  background-color: #0074d9;
}

.List__item--aqua {
  background-color: #7fdbff;
}

.List__item--teal {
  background-color: #39cccc;
}

.List__item--olive {
  background-color: #3d9970;
}

.List__item--green {
  background-color: #2ecc40;
}

.List__item--lime {
  background-color: #01ff70;
}

.List__item--yellow {
  background-color: #ffdc00;
}

.List__item--orange {
  background-color: #ff851b;
}

.List__item--red {
  background-color: #ff4136;
}

.List__item--maroon {
  background-color: #85144b;
}

.List__item--fuchsia {
  background-color: #f012be;
}

.List__item--purple {
  background-color: #b10dc9;
}

.List__item--black {
  background-color: #111111;
}

.List__item--gray {
  background-color: #aaaaaa;
}

.List__item--silver {
  background-color: #dddddd;
}


*/


const { Fragment } = React;


// Implement a feature to allow item selection with the following requirements:
// 1. Clicking an item selects/unselects it.
// 2. Multiple items can be selected at a time.
// 3. Make sure to avoid unnecessary re-renders of each list item in the big list (performance).
// 4. Currently selected items should be visually highlighted.
// 5. Currently selected items' names should be shown at the top of the page.
//
// Feel free to change the component structure at will.

const List = ({ items }) => (
  <Fragment>
    <ul className="List">
      {items.map(item => (
        <li key={item.name} className={`List__item List__item--${item.color}`}>
          {item.name}
        </li>
      ))}
    </ul>
  </Fragment>
);

// ---------------------------------------
// Do NOT change anything below this line.
// ---------------------------------------

const sizes = ['tiny', 'small', 'medium', 'large', 'huge'];
const colors = ['navy', 'blue', 'aqua', 'teal', 'olive', 'green', 'lime', 'yellow', 'orange', 'red', 'maroon', 'fuchsia', 'purple', 'silver', 'gray', 'black'];
const fruits = ['apple', 'banana', 'watermelon', 'orange', 'peach', 'tangerine', 'pear', 'kiwi', 'mango', 'pineapple'];

const items = sizes.reduce(
  (items, size) => [
    ...items,
    ...fruits.reduce(
      (acc, fruit) => [
        ...acc,
        ...colors.reduce(
          (acc, color) => [
            ...acc,
            {
              name: `${size} ${color} ${fruit}`,
              color,
            },
          ],
          [],
        ),
      ],
      [],
    ),
  ],
  [],
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <List items={items}/>,
);
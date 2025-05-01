import React from 'react';
import {VscSnake} from "react-icons/vsc";
import ReactDOMServer from 'react-dom/server';

// Render the icon to a string
const iconString = ReactDOMServer.renderToString(<VscSnake/>);
console.log(iconString);
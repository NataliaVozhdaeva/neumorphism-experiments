import { useState } from 'react';
import Nav from '../components/nav';

function Requests() {
  return (
    <div className='requests contentContainer'>
      <Nav />
      <h1 className='title title--main'>Here will be the history of requests</h1>
    </div>
  );
}

export default Requests;

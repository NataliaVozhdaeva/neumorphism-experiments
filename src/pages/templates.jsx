import Nav from '../components/nav';
import Btn from '../components/button';
import Input from '../components/input';
import Textarea from '../components/textarea';

import '../styles/templates.css';

function Templates() {
  return (
    <div className='templates contentContainer'>
      <Nav />
      <h1 className='title title--main'>Templates</h1>
      <div className='components'>
        <Btn text='Btn text' className='customClassName' />
        <Input />
        <Textarea rows={'5'} />
      </div>
    </div>
  );
}

export default Templates;

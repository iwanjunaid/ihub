const IHub = require('../index');

class User {
  boot(hub, done) {
    /** Save hub references for later use */
    this.hub = hub;
    done();
  }

  /**
   * This method needs SendMail api from Mailer component.
   */
  async create(name, email) {
    return await this.hub.api('Mailer', 'SendMail', {
      email,
      subject: `Hi ${name}`,
      text: `Welcome to The Jungle!`
    });
  }
}

class Mailer {
  boot(hub, done) {
    this.hub = hub;
    done();
  }

  /**
   * This api is required by User component.
   */
  apiSendMail({ email, subject, text }) {
    return Promise.resolve({ email, subject, text });
  }
}

class InvalidComponent {}

describe('Class IHub', () => {
  const hub = new IHub();
  const user = new User();
  const mailer = new Mailer();

  beforeEach(() => {
    hub.unregister('User');
    hub.unregister('Mailer');
  });

  it('should throws error when component name is not set', async () => {
    const [err] = await to(hub.register([
      []
    ]));

    expect(err.message).to.equal(`Component name should be provided!`);
  });

  it('should throws error when component object is not set', async () => {
    const [err] = await to(hub.register([
      ['Mailer']
    ]));

    expect(err.message).to.equal(`Component object should be provided!`);
  });

  it('should not throws error if register argument is undefined', async () => {
    const [err] = await to(hub.register());

    expect(err).to.be.null;
  });

  it('should not register component that has no boot function', async () => {
    await hub.register([
      ['Invalid', new InvalidComponent()]
    ]);    

    expect(hub.isRegistered('Invalid')).to.be.false;
  });

  it('should has User and Mailer component', async () => {
    await hub.register([
      ['User', user],
      ['Mailer', mailer]
    ]);

    expect(hub.isRegistered('User')).to.be.true;
    expect(hub.isRegistered('Mailer')).to.be.true;
  });

  it('should register Mailer first then User', async () => {
    await hub.register([
      ['User', user, ['Mailer']],
      ['Mailer', mailer]
    ]);

    expect(hub.timestamp('User') > hub.timestamp('Mailer')).to.be.true;
  });

  it('should has api SendMail on Mailer component', async() => {
    await hub.register([
      ['Mailer', mailer]
    ]);

    expect(hub.hasApi('Mailer', 'SendMail')).to.be.true;
  });

  it('should not have api Unknown on Mailer component', async() => {
    await hub.register([
      ['Mailer', mailer]
    ]);

    expect(hub.hasApi('Mailer', 'Unknown')).to.be.false;
  });

  it('should not have api Unknown on Unknown component', async() => {
    await hub.register([
      ['Mailer', mailer]
    ]);

    expect(hub.hasApi('Unknown', 'Unknown')).to.be.false;
  });

  it('should throws error when call unknown api', async() => {
    await hub.register([
      ['Mailer', mailer]
    ]);

    const [err] = await to(hub.api('Mailer', 'Unknown'));

    expect(err.message).to.equal('API not found!');
  });

  it('should be able to call api SendMail on Mailer component', async () => {
    await hub.register([
      ['User', user, ['Mailer']],
      ['Mailer', mailer]
    ]);

    const [err, result] = await to(user.create('John Doe', 'john@doe.com'));

    expect(err).to.be.null;
  });

});

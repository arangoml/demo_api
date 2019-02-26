'use strict';

module.context.use('/datasets', require('./routes/datasets'), 'datasets');
module.context.use('/models', require('./routes/models'), 'models');
module.context.use('/experiments', require('./routes/experiments'), 'experiments');
module.context.use('/notebooks', require('./routes/notebooks'), 'notebooks');

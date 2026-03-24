module.exports = function({ types: t }) {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(
                t.identifier('env'),
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('MODE'),
                    t.stringLiteral(process.env.NODE_ENV || 'development')
                  )
                ])
              ),
              t.objectProperty(
                t.identifier('url'),
                t.conditionalExpression(
                  t.binaryExpression(
                    '!==',
                    t.unaryExpression('typeof', t.identifier('window')),
                    t.stringLiteral('undefined')
                  ),
                  t.memberExpression(
                    t.memberExpression(t.identifier('window'), t.identifier('location')),
                    t.identifier('href')
                  ),
                  t.stringLiteral('')
                )
              )
            ])
          );
        }
      }
    }
  };
};

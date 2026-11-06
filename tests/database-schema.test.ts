import { describe, expect, it } from 'vitest'
import { readSchema, schemaDifferences } from '../scripts/check-database-schema.mjs'

const schema = {
  tables: [], columns: [], constraints: [], indexes: [], policies: [], functions: [], triggers: [],
}

describe('database schema deployment gate', () => {
  it('accepts equal metadata despite object key ordering', () => {
    expect(schemaDifferences({ tables: [{ name: 'profiles', rls: true }] }, {
      tables: [{ rls: true, name: 'profiles' }],
    })).toEqual([])
  })

  it('detects missing primary keys and unexpected legacy columns', () => {
    expect(schemaDifferences({ columns: ['id'], constraints: ['PRIMARY KEY (id)'] }, {
      columns: ['id', 'shell_id'], constraints: ['PRIMARY KEY (shell_id)'],
    })).toEqual(['columns', 'constraints'])
  })

  it('detects extra schema sections', () => {
    expect(schemaDifferences({ tables: [] }, { tables: [], policies: ['unexpected'] })).toEqual(['policies'])
  })

  it('reads only the metadata snapshot from the cli envelope', () => {
    expect(readSchema(JSON.stringify({ rows: [{ schema }], warning: 'untrusted data' }))).toEqual(schema)
  })

  it('fails closed when the cli response is incomplete or invalid', () => {
    expect(() => readSchema('{}')).toThrow('Invalid schema snapshot')
    expect(() => readSchema(JSON.stringify({ rows: [{ schema: { tables: [] } }] }))).toThrow('Invalid schema snapshot')
    expect(() => readSchema('not json')).toThrow()
  })
})

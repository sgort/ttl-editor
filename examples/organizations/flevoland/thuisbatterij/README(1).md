# Camunda 7 `.form` files for Recht en Hoogte DMN decisions

These are Camunda Forms JSON files for Camunda Platform 7. They collect the process variables required to evaluate the two DMN decisions in `RechtEnHoogteSubsidieThuisbatterij.dmn`.

## Files

- `forms/recht-op-subsidie-thuisbatterij.form`
  - Form id: `recht-op-subsidie-thuisbatterij`
  - Decision: `RechtOpSubsidieThuisbatterij`
  - Expected DMN outputs: `rechtOpSubsidie` (`Boolean`), `reden` (`String`)
- `forms/hoogte-subsidie-thuisbatterij.form`
  - Form id: `hoogte-subsidie-thuisbatterij`
  - Decision: `BehaalbareHoogteSubsidie`
  - Expected DMN output: `hoogteSubsidie` (`Double`)

## Camunda Modeler configuration

For each User Task or Start Event, configure:

- Type: `Camunda Forms`
- Form Ref: the form id listed above
- Binding: `deployment` if the `.form` file is deployed together with the BPMN/DMN; otherwise use `latest` if that is your preferred deployment strategy.

Equivalent BPMN XML examples:

```xml
<bpmn:userTask id="Task_Recht" name="Vraag recht-inputs"
               camunda:formRef="recht-op-subsidie-thuisbatterij"
               camunda:formRefBinding="deployment" />

<bpmn:userTask id="Task_Hoogte" name="Vraag hoogte-inputs"
               camunda:formRef="hoogte-subsidie-thuisbatterij"
               camunda:formRefBinding="deployment" />
```

## Deployment notes

- Include the `.form` files in the same deployment as the BPMN/DMN if you use `deployment` binding.
- For Spring Boot auto-deployment, make sure your deployment resource pattern includes `**/*.form`.
- The form `id` inside each `.form` file is what Camunda uses as `Form Ref`; the filename can be different, but keeping them aligned is easier.

## DMN variable mapping

### Recht form

| Variable                  | Form component |  DMN type | DMN input                            |
| ------------------------- | -------------- | --------: | ------------------------------------ |
| `aanvragerFailliet`       | Checkbox       | `boolean` | Aanvrager is failliet                |
| `provincieWoning`         | Select         |  `string` | Provincie woning                     |
| `relatieTotWoning`        | Select         |  `string` | Relatie tot woning                   |
| `toestemmingEigenaar`     | Checkbox       | `boolean` | Toestemming eigenaar                 |
| `rekeningNaamKomtOvereen` | Checkbox       | `boolean` | Naam op energierekening komt overeen |

### Hoogte form

| Variable                      | Form component | DMN type | DMN input                                   |
| ----------------------------- | -------------- | -------: | ------------------------------------------- |
| `gemaakteKosten`              | Number         | `double` | Gemaakte kosten                             |
| `aanvraagDatum`               | Date           | `string` | Aanvraagdatum; expected format `yyyy-MM-dd` |
| `aanvragerType`               | Select         | `string` | Aanvrager type                              |
| `reedsGesubsidieerdEigenaren` | Number         | `double` | Reeds gesubsidieerd eigenaren               |
| `reedsGesubsidieerdHuurders`  | Number         | `double` | Reeds gesubsidieerd huurders                |

## Notes

- Boolean inputs use checkbox components because Camunda Forms checkboxes bind to boolean values. A checked box means `true`; an unchecked box means `false`.
- `aanvraagDatum` uses a date component but is still bound to the key `aanvraagDatum`; the DMN rules call `date(aanvraagDatum)`, so the value should be `yyyy-MM-dd`.
- These forms only collect variables. Evaluate the DMN using a Business Rule Task or the Decision Service after the form is submitted.
- The height decision depends on child decisions for `basisHoogteSubsidie`, `beschikbaarSubsidiePlafond`, constants, and year budget; those are not asked in the form because they are calculated by the DMN model.

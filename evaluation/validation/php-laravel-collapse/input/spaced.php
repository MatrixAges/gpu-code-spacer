<?php


class ValidationSample {


    public static function collapse($array)


    {


        $results = [];


        foreach ($array as $values) {


            if ($values instanceof Collection) {


                $results[] = $values->all();


            } elseif (is_array($values)) {


                $results[] = $values;


            }


        }


        return array_merge([], ...$results);


    }


}
